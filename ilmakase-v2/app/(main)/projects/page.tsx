'use client'

import { useState } from 'react'
import { useProjects, type Project } from '@/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/UI'
import { ProjectDetailModal } from '@/components/Project'
import { formatDate, calculatePeriodMonths } from '@/lib/utils'

export default function ProjectsPage() {
  const { user } = useAuth()
  const {
    projects,
    activeProjects,
    completedProjects,
    loading,
    createProject,
    updateProject,
  } = useProjects()

  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      setCreating(true)
      await createProject(newProjectName.trim())
      setNewProjectName('')
      setShowNewProject(false)
    } catch (err) {
      console.error('프로젝트 생성 실패:', err)
      alert('프로젝트 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleCompleteProject = async (id: string) => {
    if (!confirm('이 프로젝트를 완료 처리하시겠습니까?')) return

    try {
      await updateProject(id, {
        status: '완료',
        end_date: new Date().toISOString().split('T')[0],
      })
    } catch (err) {
      console.error('프로젝트 완료 처리 실패:', err)
      alert('프로젝트 완료 처리에 실패했습니다.')
    }
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setSelectedProject(null)
  }

  const handleSaveProject = async (updates: Partial<Project>) => {
    if (!editingProject) return
    await updateProject(editingProject.id, updates)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">🍊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">일마카세</h1>
                <p className="text-xs text-gray-500">프로젝트 관리</p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setShowNewProject(true)}
            >
              + 새 프로젝트
            </Button>
          </div>

          {/* 탭 메뉴 */}
          <div className="flex gap-2 mt-4">
            <a
              href="/worklog"
              className="px-5 py-2 rounded-xl font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50"
            >
              <span className="flex items-center gap-2">
                <span>📝</span>
                <span>데일리 로그</span>
              </span>
            </a>
            <a
              href="/projects"
              className="px-5 py-2 rounded-xl font-medium bg-white text-primary-600 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span>📁</span>
                <span>프로젝트</span>
              </span>
            </a>
            <a
              href="/review"
              className="px-5 py-2 rounded-xl font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50"
            >
              <span className="flex items-center gap-2">
                <span>📊</span>
                <span>회고</span>
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 새 프로젝트 폼 */}
        {showNewProject && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새 프로젝트 만들기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="프로젝트 이름 (예: 도매 플랫폼 런칭)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  className="flex-1"
                />
                <Button
                  onClick={handleCreateProject}
                  loading={creating}
                  disabled={!newProjectName.trim()}
                >
                  만들기
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewProject(false)
                    setNewProjectName('')
                  }}
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-4xl mb-4">📁</div>
              <p className="text-gray-500 mb-4">
                아직 프로젝트가 없습니다.<br />
                첫 번째 프로젝트를 만들어보세요!
              </p>
              <Button
                variant="primary"
                onClick={() => setShowNewProject(true)}
              >
                + 새 프로젝트 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* 진행 중인 프로젝트 */}
            {activeProjects.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  진행 중인 프로젝트 ({activeProjects.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeProjects.map((project) => (
                    <Card
                      key={project.id}
                      variant="bordered"
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedProject === project.id ? 'ring-2 ring-primary-500' : ''
                      }`}
                      onClick={() => setSelectedProject(
                        selectedProject === project.id ? null : project.id
                      )}
                    >
                      <CardContent>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {project.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {project.start_date && formatDate(project.start_date, 'yyyy.MM.dd')} ~
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                            진행중
                          </span>
                        </div>

                        {project.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.keywords.slice(0, 3).map((keyword) => (
                              <span
                                key={keyword}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 프로젝트 요약 (있으면 표시) */}
                        {project.summary && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {project.summary}
                          </p>
                        )}

                        {/* 성과 개수 표시 */}
                        {project.outcomes && project.outcomes.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 mb-2">
                            <span>성과 {project.outcomes.length}개 등록됨</span>
                          </div>
                        )}

                        {selectedProject === project.id && (
                          <div className="pt-3 border-t border-gray-200 space-y-2">
                            <Button
                              variant="primary"
                              size="sm"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditProject(project)
                              }}
                            >
                              상세 정보 편집
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: 프로젝트 카드 생성 페이지로 이동
                                alert('경력기술서 생성 기능 (준비 중)')
                              }}
                            >
                              경력기술서 생성
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCompleteProject(project.id)
                              }}
                            >
                              프로젝트 완료
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* 완료된 프로젝트 */}
            {completedProjects.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  완료된 프로젝트 ({completedProjects.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => setSelectedProject(
                        selectedProject === project.id ? null : project.id
                      )}
                    >
                      <CardContent>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-700">
                              {project.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {project.start_date && formatDate(project.start_date, 'yyyy.MM.dd')} ~{' '}
                              {project.end_date && formatDate(project.end_date, 'yyyy.MM.dd')}
                              {project.start_date && project.end_date && (
                                <span className="ml-1">
                                  ({calculatePeriodMonths(project.start_date, project.end_date)}개월)
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                            완료
                          </span>
                        </div>

                        {/* 프로젝트 요약 (있으면 표시) */}
                        {project.summary && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {project.summary}
                          </p>
                        )}

                        {/* 성과 개수 표시 */}
                        {project.outcomes && project.outcomes.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 mb-2">
                            <span>성과 {project.outcomes.length}개 등록됨</span>
                          </div>
                        )}

                        {selectedProject === project.id && (
                          <div className="pt-3 border-t border-gray-200 space-y-2">
                            <Button
                              variant="primary"
                              size="sm"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditProject(project)
                              }}
                            >
                              상세 정보 편집
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation()
                                alert('경력기술서 생성 기능 (준비 중)')
                              }}
                            >
                              경력기술서 생성
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* 프로젝트 상세 편집 모달 */}
      {editingProject && (
        <ProjectDetailModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProject}
        />
      )}
    </div>
  )
}
