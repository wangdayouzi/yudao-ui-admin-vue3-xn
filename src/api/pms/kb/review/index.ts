import request from '@/config/axios'

export interface KnowledgeReviewRuleVO {
  id?: number
  libraryId: number
  folderId: number
  intervalMonths: number
  remindDays: number
  enabled: boolean
}
export interface KnowledgeReviewRecordVO {
  id: number
  documentId: number
  result: string
  reviewDate: string
  remark?: string
  reviewerId: number
}
export interface KnowledgeReviewDueVO {
  documentId: number
  title: string
  documentCode: string
  dueDate: string
  overdue: boolean
  result: string
}
export const getReviewRules = (libraryId: number) =>
  request.get<KnowledgeReviewRuleVO[]>({ url: '/pms/kb/review/rules', params: { libraryId } })
export const saveReviewRule = (data: KnowledgeReviewRuleVO) =>
  request.post<number>({ url: '/pms/kb/review/rule', data })
export const getReviewDue = (libraryId: number) =>
  request.get<KnowledgeReviewDueVO[]>({ url: '/pms/kb/review/due', params: { libraryId } })
export interface KnowledgeReviewWorkbenchVO {
  documentId: number
  libraryId: number
  title: string
  documentCode: string
  dueDate: string
  lastReviewDate: string
  result: string
  stage: 'overdue' | 'upcoming' | 'normal' | 'no_rule' | 'closed'
}
export const getReviewWorkbench = (libraryId?: number) =>
  request.get<KnowledgeReviewWorkbenchVO[]>({ url: '/pms/kb/review/workbench', params: { libraryId } })
export const getReviewHistory = (documentId: number) =>
  request.get<KnowledgeReviewRecordVO[]>({ url: '/pms/kb/review/history', params: { documentId } })
export interface KnowledgeReviewSummaryVO { result: string; dueDate: string; overdue: boolean }
export const getReviewSummary = (documentId: number) =>
  request.get<KnowledgeReviewSummaryVO>({ url: '/pms/kb/review/summary', params: { documentId } })
export const submitReview = (data: { documentId: number; result: string; remark: string }) =>
  request.post<number>({ url: '/pms/kb/review/submit', data })
