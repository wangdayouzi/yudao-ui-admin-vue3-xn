import request from '@/config/axios'

export const exportKnowledgeArchive = (libraryId: number, documentIds: number[] = []) =>
  request.download<Blob>({
    url: '/pms/kb/archive/export',
    params: { libraryId, documentIds: documentIds.length ? documentIds.join(',') : undefined },
    timeout: 180000
  })

export const restoreKnowledgeArchive = (libraryId: number, file: File) => {
  const data = new FormData()
  data.append('libraryId', String(libraryId))
  data.append('file', file)
  return request.post<number>({
    url: '/pms/kb/archive/restore',
    data,
    headersType: 'multipart/form-data',
    timeout: 180000
  })
}

export const batchImportKnowledgeFiles = (libraryId: number, files: File[]) => {
  const data = new FormData()
  data.append('libraryId', String(libraryId))
  data.append('folderId', '0')
  data.append('parentId', '0')
  files.forEach((file) => data.append('files', file))
  return request.post<number[]>({
    url: '/pms/kb/archive/batch-import',
    data,
    headersType: 'multipart/form-data',
    timeout: 180000
  })
}

export const rebuildKnowledgeSearchIndex = (libraryId: number) =>
  request.post<number>({ url: '/pms/kb/archive/reindex', params: { libraryId }, timeout: 180000 })
