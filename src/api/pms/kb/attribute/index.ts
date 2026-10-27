import request from '@/config/axios'

export interface KnowledgeAttributeVO {
  id?: number
  libraryId: number
  fieldCode: string
  fieldName: string
  fieldType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'user'
  optionsJson?: string
  required: boolean
  enabled: boolean
  sort: number
}

export const getKnowledgeAttributes = (libraryId: number) =>
  request.get<KnowledgeAttributeVO[]>({ url: '/pms/kb/attribute/list', params: { libraryId } })
export const saveKnowledgeAttribute = (data: KnowledgeAttributeVO) =>
  request.post<number>({ url: '/pms/kb/attribute/save-definition', data })
export const saveKnowledgeAttributeValues = (documentId: number, data: Record<string, string>) =>
  request.put({ url: '/pms/kb/attribute/save-values', params: { documentId }, data })
