/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Course from "../types/course";
import { getCourses } from "./useCourses";
import { getAllAssignmentsRequest, useCanvasAssignments } from "./useAssignments";
import { AssignmentType, Options } from "../types";
import loadGradescopeAssignments from "./utils/loadGradescope";

type assignment = {
  dueDate: string,
  stageId: number,
  title: string,
  description: string
}

export async function sendCourses() {
  try {
    const courses: Course[] = await getCourses();
    console.log('Retrieved courses:', courses);

    // Filter and map courses, only including valid ones
    const classSection = courses
      .filter(course => {
        // Check if this is a valid course that should be imported
        const shouldImport = course.course_code?.includes('.') ||
          (course.name && !course.name.includes('Advising'));
        if (!shouldImport) {
          console.log('Skipping course:', course.name || course.course_code);
        }
        return shouldImport;
      })
      .map((course) => {
        // Handle course code parsing
        const codeParts = (course.course_code || course.name || '').split('.');
        const classCode = codeParts[0];
        const sectionId = codeParts[1] || '001'; // Default section if not specified
        const semesterId = codeParts[2] || 'FA24'; // Default semester if not specified

        return {
          classCode: classCode,
          color: course.color || '#000000',
          sectionId: sectionId,
          semesterId: semesterId
        };
      })
      .filter(entry => {
        // Validate the entry has a valid class code (not empty and no spaces)
        const isValid = entry.classCode && !entry.classCode.includes(' ');
        if (!isValid) {
          console.log('Filtering out invalid entry:', entry);
        }
        return isValid;
      });

    if (classSection.length === 0) {
      throw new Error('No valid courses to import after filtering');
    }

    console.log('Sending filtered class sections:', classSection);

    const importedClasses = await importCanvasClasses(classSection);
    console.log('Successfully imported classes:', importedClasses);
    return importedClasses;
  } catch (error) {
    console.error('Failed to send courses:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}

const matchingCourse = async (course_id: string) => {
  const courses: Course[] = await getCourses();
  return courses.find((c: Course) => {
    const courseId = parseInt(c.id);
    console.log('Comparing course IDs:', courseId, course_id);
    return courseId === parseInt(course_id);
  });
}

async function sendAssignments(): Promise<boolean> {
  const rn = new Date();
  const st = new Date(rn.getFullYear() - 1, 0, 1);
  const en = new Date(rn.getFullYear(), 11, 31);
  const startStr = st.toISOString().split('T')[0];
  const endStr = en.toISOString().split('T')[0];
  console.log('Start date:', startStr);
  console.log('End date:', endStr);
  const options: Options = {
    GSCOPE_INT_disabled: false,
    color_tabs: false,
    dark_mode: false,
    dash_courses: false,
    due_date_headings: false,
    rolling_period: false,
    show_confetti: false,
    show_locked_assignments: false,
    show_long_overdue: false,
    show_needs_grading: false,
    sidebar: false,
    start_hour: 0,
    start_minutes: 0,
    theme_color: "",
    start_date: Number(startStr),
    period: "Day"
  }

  let assignments = await getAllAssignmentsRequest(startStr, endStr);
  let gScopeAssignments = await loadGradescopeAssignments(st, en, options)
  const submittedAssignments = new Set<string>();
  console.log('Gradescope assignments:', gScopeAssignments);

  // Fix assignment type filtering
  assignments = assignments.filter((a) => {
    const type = a.plannable_type as AssignmentType;
    const submitted = () => {
      if (a.submissions) {
        console.log('Submission for assignment:', a.plannable.title, 'sub:', a.submissions.submitted);
        if (a.submissions.submitted) {
          submittedAssignments.add(a.plannable.title.toLowerCase().trim()); // Add to Set if submitted
        }
        return a.submissions.submitted;
      }
      return false;
    }
    return (type === AssignmentType.ASSIGNMENT ||
      type === AssignmentType.QUIZ ||
      type === AssignmentType.GRADESCOPE) && !submitted();
  });

  const courses: Course[] = await getCourses();
  console.log('Courses for assignment mapping:', courses.map(c => ({
    id: c.id,
    code: c.course_code,
    start_at: c.start_at,
  })));

  const task = assignments.reduce((acc, assignment) => {
    if (!assignment.course_id) {
      console.log('Skipping assignment with no course ID:', assignment.plannable.title);
      return acc;
    }

    // Find matching course and get class code
    const matchingCourse = courses.find((c: Course) => {
      // Handle both string and number comparisons
      const courseId = parseInt(c.id);
      return courseId === assignment.course_id;
    });

    console.log('Assignment mapping:', {
      courseId: assignment.course_id,
      foundCourse: matchingCourse?.course_code,
      title: assignment.plannable.title,
    });

    if (!matchingCourse) {
      console.log('No matching course found for:', assignment.course_id);
      return acc;
    }
    if (!matchingCourse?.course_code) {
      console.log('No course code found for course:', matchingCourse);
      return acc;
    }

    const classCode = matchingCourse.course_code?.split('.')[0] || '0';

    const dueDate = assignment.plannable.due_at?.split('T')[0] || 'No due date';
    const title = assignment.plannable.title || 'Untitled';
    const description = assignment.plannable.details || 'No description';
    const stageId = 1;

    // Find existing class entry or create a new one
    let classEntry = acc.find((item) => item.classCode === classCode);
    if (!classEntry) {
      classEntry = {
        classCode,
        assignment: [],
      };
      acc.push(classEntry);
    }

    // Add the current assignment to the class entry
    classEntry.assignment.push({
      dueDate,
      stageId,
      description,
      title,
    });

    return acc;
  }, [] as {
    classCode: string;
    assignment: {
      dueDate: string;
      stageId: number;
      description: string;
      title: string
    }[]
  }[]);

  const gScopeTasks = new Map<string, assignment[]>();
  const gScopeTitles = new Set<string>();

  const gScopeFilter = gScopeAssignments.map(async (assignment) => {
    console.log('Gradescope course id:', assignment.course_id);

    // Skip if title matches a submitted Canvas assignment
    if (submittedAssignments.has(assignment.name.toLowerCase().trim())) {
      console.log('Skipping Gradescope assignment - already submitted in Canvas:', assignment.name);
      return;
    }

    // Skip if the Gradescope assignment is submitted
    if (assignment.submitted) {
      console.log('Skipping submitted Gradescope assignment:', assignment.name);
      submittedAssignments.add(assignment.name.toLowerCase().trim()); // Add to Set
      return;
    }

    gScopeTitles.add(assignment.name.toLowerCase().trim());

    const classCode = await matchingCourse(assignment.course_id)?.then(course => {
      return course?.course_code?.split('.')[0] || '0';
    })
    const dueDate = assignment.due_at?.split('T')[0] || 'No due date';
    const title = assignment.name;
    const description = 'No description'
    if (!gScopeTasks.has(classCode)) {
      gScopeTasks.set(classCode, []);
    }
    if (!gScopeTasks.get(classCode)?.forEach((a) => a.title === title)) {
      gScopeTasks.get(classCode)?.push({
        dueDate,
        stageId: 1,
        description,
        title
      });
    }
  });

  await Promise.all(gScopeFilter);

  const filteredTask = task.map(t => ({
    ...t,
    assignment: t.assignment.filter(a => !gScopeTitles.has(a.title.toLowerCase().trim()))
  })).filter(t => t.assignment.length > 0);

  const combinedTasks = filteredTask.slice();

  Array.from(gScopeTasks).forEach(([classCode, assignments]) => {
    const existingEntry = combinedTasks.find(t => t.classCode === classCode);
    if (existingEntry) {
      existingEntry.assignment.push(...assignments);
    } else {
      combinedTasks.push({
        classCode,
        assignment: assignments
      });
    }
  });

  const validTasks = combinedTasks
    .map(t => ({
      ...t,
      assignment: t.assignment.filter(a => !submittedAssignments.has(a.title.toLowerCase().trim()))
    }))
    .filter(t => t.classCode !== '0' && t.assignment.length > 0);

  console.log('Final assignment tasks:', validTasks);

  try {
    const response = await Promise.race([
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'MAKE_TASK_REQUEST',
          data: {
            taskInput: validTasks,
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      )
    ]);
    const result = response as any;
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
  } catch (error) {
    console.error('Error sending assignments:', error);
    throw error;
  }
  return true;
}

const importCanvasClasses = async (courseInput: Array<{
  classCode: string;
  color: string;
  sectionId: string;
  semesterId: string;
}>) => {
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'MAKE_CLASS_REQUEST',
        data: {
          courseInput,
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    const result = response as any;

    await sendAssignments();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.importCanvasClasses;
  } catch (error) {
    console.error('Error importing canvas classes:', error);
    throw error;
  }
};

