migrate(
  (app) => {
    var projectsId = app.findCollectionByNameOrId('projects').id

    var projectMembers = new Collection({
      name: 'project_members',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (project.user = @request.auth.id || user = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (project.user = @request.auth.id || user = @request.auth.id)",
      createRule: "@request.auth.id != '' && project.user = @request.auth.id",
      updateRule: "@request.auth.id != '' && project.user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && project.user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'project',
          type: 'relation',
          required: true,
          collectionId: projectsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['lancador', 'administrador'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_project_members_user ON project_members (user)',
        'CREATE INDEX idx_project_members_project ON project_members (project)',
        'CREATE UNIQUE INDEX idx_project_members_user_project ON project_members (user, project)',
      ],
    })
    app.save(projectMembers)

    var txCol = app.findCollectionByNameOrId('transactions')
    txCol.listRule = "@request.auth.id != ''"
    txCol.viewRule = "@request.auth.id != ''"
    txCol.updateRule =
      "@request.auth.id != '' && (user = @request.auth.id || project.user = @request.auth.id)"
    txCol.deleteRule =
      "@request.auth.id != '' && (user = @request.auth.id || project.user = @request.auth.id)"
    app.save(txCol)

    var catCol = app.findCollectionByNameOrId('categories')
    catCol.listRule = "@request.auth.id != ''"
    catCol.viewRule = "@request.auth.id != ''"
    app.save(catCol)

    var extCol = app.findCollectionByNameOrId('extratos')
    extCol.listRule = "@request.auth.id != ''"
    extCol.viewRule = "@request.auth.id != ''"
    app.save(extCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('project_members'))
    } catch (_) {}

    try {
      var txCol = app.findCollectionByNameOrId('transactions')
      txCol.listRule = "@request.auth.id != '' && user = @request.auth.id"
      txCol.viewRule = "@request.auth.id != '' && user = @request.auth.id"
      txCol.updateRule = "@request.auth.id != '' && user = @request.auth.id"
      txCol.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
      app.save(txCol)
    } catch (_) {}

    try {
      var catCol = app.findCollectionByNameOrId('categories')
      catCol.listRule = "@request.auth.id != '' && user = @request.auth.id"
      catCol.viewRule = "@request.auth.id != '' && user = @request.auth.id"
      app.save(catCol)
    } catch (_) {}

    try {
      var extCol = app.findCollectionByNameOrId('extratos')
      extCol.listRule = "@request.auth.id != '' && user = @request.auth.id"
      extCol.viewRule = "@request.auth.id != '' && user = @request.auth.id"
      app.save(extCol)
    } catch (_) {}
  },
)
