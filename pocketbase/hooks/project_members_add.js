routerAdd(
  'POST',
  '/backend/v1/project-members/add',
  (e) => {
    var body = e.requestInfo().body || {}
    var userId = e.auth && e.auth.id
    if (!userId) {
      throw new UnauthorizedError('auth required')
    }

    var projectId = body.projectId || ''
    var email = (body.email || '').trim().toLowerCase()
    var role = body.role || 'lancador'

    if (!projectId) {
      throw new BadRequestError('projectId is required')
    }
    if (!email) {
      throw new BadRequestError('email is required', { email: 'E-mail é obrigatório.' })
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
        $app.findFirstRecordByFilter(
          'project_members',
          "project = {:pid} && user = {:uid} && role = 'administrador'",
          { pid: projectId, uid: userId },
        )
      } catch (_) {
        throw new ForbiddenError('only administrators can manage members')
      }
    }

    var targetUser
    try {
      targetUser = $app.findAuthRecordByEmail('users', email)
    } catch (_) {
      throw new BadRequestError('Usuário não encontrado', {
        email: 'Usuário não encontrado — a pessoa precisa ter uma conta no sistema.',
      })
    }

    if (project.getString('user') === targetUser.id) {
      throw new BadRequestError('Esta pessoa já é membro deste projeto.', {
        email: 'Esta pessoa já é membro deste projeto.',
      })
    }

    try {
      $app.findFirstRecordByFilter('project_members', 'project = {:pid} && user = {:uid}', {
        pid: projectId,
        uid: targetUser.id,
      })
      throw new BadRequestError('Esta pessoa já é membro deste projeto.', {
        email: 'Esta pessoa já é membro deste projeto.',
      })
    } catch (err) {
      if (err && err.message && err.message.indexOf('already') >= 0) {
        throw err
      }
    }

    var col = $app.findCollectionByNameOrId('project_members')
    var record = new Record(col)
    record.set('user', targetUser.id)
    record.set('project', projectId)
    record.set('role', role)
    $app.save(record)

    return e.json(201, {
      id: record.id,
      userId: targetUser.id,
      userName: targetUser.getString('name') || '',
      userEmail: targetUser.getString('email') || '',
      role: role,
      isOwner: false,
    })
  },
  $apis.requireAuth(),
)
