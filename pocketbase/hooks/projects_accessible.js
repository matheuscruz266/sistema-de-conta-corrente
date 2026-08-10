routerAdd(
  'GET',
  '/backend/v1/projects/accessible',
  (e) => {
    var userId = e.auth && e.auth.id
    if (!userId) {
      throw new UnauthorizedError('auth required')
    }

    var result = []

    try {
      var owned = $app.findRecordsByFilter('projects', 'user = {:uid}', 'name', 0, 0, {
        uid: userId,
      })
      for (var i = 0; i < owned.length; i++) {
        var p = owned[i]
        result.push({
          id: p.id,
          user: p.getString('user'),
          name: p.getString('name'),
          description: p.getString('description'),
          color: p.getString('color'),
          created: p.getString('created'),
          updated: p.getString('updated'),
          isOwner: true,
          role: 'administrador',
        })
      }
    } catch (_) {}

    try {
      var memberships = $app.findRecordsByFilter(
        'project_members',
        'user = {:uid}',
        '-created',
        0,
        0,
        { uid: userId },
      )
      for (var j = 0; j < memberships.length; j++) {
        var m = memberships[j]
        var projectId = m.getString('project')
        var alreadyExists = false
        for (var k = 0; k < result.length; k++) {
          if (result[k].id === projectId) {
            alreadyExists = true
            break
          }
        }
        if (alreadyExists) continue

        try {
          var proj = $app.findRecordById('projects', projectId)
          result.push({
            id: proj.id,
            user: proj.getString('user'),
            name: proj.getString('name'),
            description: proj.getString('description'),
            color: proj.getString('color'),
            created: proj.getString('created'),
            updated: proj.getString('updated'),
            isOwner: false,
            role: m.getString('role'),
          })
        } catch (_) {}
      }
    } catch (_) {}

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
