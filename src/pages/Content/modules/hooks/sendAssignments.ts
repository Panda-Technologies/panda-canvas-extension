import Course from '../types/course';
import {getCourses} from './useCourses';
import { getAllAssignmentsRequest } from './useAssignments';


async function sendCourses() {
    const courses: Course[] = await getCourses();
  
    // Map each Course object to the desired JSON format
    const classSection = courses.map((course) => ({
      classCode: course.course_code?.split('.')[0] || course.name.split('.')[0], // Use `course_code` if available, otherwise fallback to `name`
      color: course.color,
      sectionId: course.name.split('.')[1], 
      semester: course.name.split('.')[2],
      
    }));
  
    console.log(classSection); 
    
    const outPutString = JSON.stringify(classSection)

  }
  

async function sendAssignments(){

    const rn = new Date(); // Current date and time
    const st = new Date(rn.getFullYear(), 0, 1);
    const en = new Date(rn.getFullYear(), 11, 31);
    const startStr = st.toISOString().split('T')[0];
    const endStr = en.toISOString().split('T')[0];

    const assignments = await getAllAssignmentsRequest(startStr, endStr);

    const task = assignments.reduce((acc, assignment) => {
        const classCode = assignment.course_id || 'Unknown'; // Fallback if no course_id
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
    }, [] as { classCode: string | number; assignment: { dueDate: string; stageId: number; description: string; title: string }[] }[]);
      
    const outputString = JSON.stringify(task);
      

}

