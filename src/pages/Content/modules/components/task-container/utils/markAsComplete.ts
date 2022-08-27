import { FinalAssignment } from '../../../types';
import markAssignment from './markAssignment';

export default function markAsComplete(
  assignment: FinalAssignment
): FinalAssignment {
  assignment.marked_complete = true;
  markAssignment(true, assignment);
  return assignment;
}
