routerAdd(
  'GET',
  '/backend/v1/project-members/{projectId}',
  (e) => {
    var userId = e.auth && e.auth.id
    if (!userId) {
      throw new UnauthorizedError('auth required')
    }

    var projectId = e.request.pathValue('projectId')
    if (!projectId) {
      throw new BadRequestError('projectId is required')
    }

    var project
    try {
      project = $app.findRecordById('projects', projectId)
    } catch (_) {
      throw new NotFoundError('project not found')
    }

    var isOwner = project.getString('user') === userId

    if (!isOwner) {
      try {
        $app.findFirstRecordByFilter('project_members', 'project = {:pid} && user = {:uid}', {
          pid: projectId,
          uid: userId,
        })
      } catch (_) {
        throw new ForbiddenError('you are not a member of this project')
      }
    }

    var result = []

    try {
      var owner = $app.findRecordById('users', project.getString('user'))
      result.push({
        id: 'owner-' + owner.id,
        userId: owner.id,
        userName: owner.getString('name') || '',
        userEmail: owner.getString('email') || '',
        role: 'administrador',
        isOwner: true,
      })
    } catch (_) {}

    try {
      var members = $app.findRecordsByFilter(
        'project_members',
        'project = {:pid}',
        'created',
        0,
        0,
        { pid: projectId },
      )
      for (var i = 0; i < members.length; i++) {
        var mem = members[i]
        var memberUserId = mem.getString('user')
        if (memberUserId === project.getString('user')) continue

        try {
          var u = $app.findRecordById('users', memberUserId)
          result.push({
            id: mem.id,
            userId: u.id,
            userName: u.getString('name') || '',
            userEmail: u.getString('email') || '',
            role: mem.getString('role'),
            isOwner: false,
          })
        } catch (_) {}
      }
    } catch (_) {}

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
