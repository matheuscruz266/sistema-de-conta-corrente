onRecordCreateRequest((e) => {
  var userId = e.auth && e.auth.id
  if (!userId) {
    throw new UnauthorizedError('auth required')
  }

  var projectId = e.record.getString('project')
  if (!projectId) {
    e.next()
    return
  }

  var isAuthorized = false

  try {
    var project = $app.findRecordById('projects', projectId)
    if (project.getString('user') === userId) {
      isAuthorized = true
    }
  } catch (_) {
    throw new BadRequestError('invalid project')
  }

  if (!isAuthorized) {
    try {
      $app.findFirstRecordByFilter('project_members', 'project = {:pid} && user = {:uid}', {
        pid: projectId,
        uid: userId,
      })
      isAuthorized = true
    } catch (_) {}
  }

  if (!isAuthorized) {
    throw new ForbiddenError('you are not a member of this project')
  }

  e.next()
}, 'transactions')
