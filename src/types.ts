export type CategoryId = string;
export interface Staff { id: string; name: string; }
export interface Category { id: CategoryId; name: string; icon: string; active: boolean; }
export interface TaskItem { id: string; text: string; categoryId: CategoryId; active: boolean; }
export interface PhotoEvidence { imageUrl?: string; viewUrl?: string; localUrl: string; time: string; uploaded: boolean; }
export interface ClosingReport {
  id: string; date: string; staffId: string; staffName: string; submitTime: string;
  completedTaskIds: string[]; completedTaskNames?: string[]; photos: PhotoEvidence[];
}
export interface Database { staff: Staff[]; categories: Category[]; tasks: TaskItem[]; reports: ClosingReport[]; }
