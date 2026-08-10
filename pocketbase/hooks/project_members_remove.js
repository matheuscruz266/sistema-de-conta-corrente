routerAdd(
  'DELETE',
  '/backend/v1/project-members/{memberId}',
  (e) => {
    var userId = e.auth && e.auth.id
    if (!userId) {
      throw new UnauthorizedError('auth required')
    }

    var memberId = e.request.pathValue('memberId')
    if (!memberId) {
      throw new BadRequestError('memberId is required')
    }

    var member
    try {
      member = $app.findRecordById('project_members', memberId)
    } catch (_) {
      throw new NotFoundError('member not found')
    }

    var projectId = member.getString('project')

    var project
    try {
      project = $app.findRecordById('projects', projectId)
    } catch (_) {
      throw new NotFoundError('project not found')
    }

    var isOwner = project.getString('user') === userId

    if (!isOwner) {
      try {
        $app.findFirstRecordByFilter(
          'project_members',
          "project = {:pid} && user = {:uid} && role = 'administrador'",
          { pid: projectId, uid: userId },
        )
      } catch (_) {
        throw new ForbiddenError('only administrators can manage members')
      }
    }

    $app.delete(member)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
