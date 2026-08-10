migrate(
  (app) => {
    const projects = new Collection({
      name: 'projects',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_projects_user ON projects (user)',
        'CREATE INDEX idx_projects_name ON projects (name)',
      ],
    })
    app.save(projects)

    var projectsId = app.findCollectionByNameOrId('projects').id

    var txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('project')) {
      txCol.fields.add(
        new RelationField({
          name: 'project',
          collectionId: projectsId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      txCol.addIndex('idx_transactions_project', false, 'project', '')
      app.save(txCol)
    }

    var catCol = app.findCollectionByNameOrId('categories')
    if (!catCol.fields.getByName('project')) {
      catCol.fields.add(
        new RelationField({
          name: 'project',
          collectionId: projectsId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      catCol.addIndex('idx_categories_project', false, 'project', '')
      app.save(catCol)
    }

    var extCol = app.findCollectionByNameOrId('extratos')
    if (!extCol.fields.getByName('project')) {
      extCol.fields.add(
        new RelationField({
          name: 'project',
          collectionId: projectsId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      extCol.addIndex('idx_extratos_project', false, 'project', '')
      app.save(extCol)
    }
  },
  (app) => {
    var cols = ['transactions', 'categories', 'extratos']
    for (var i = 0; i < cols.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(cols[i])
        if (col.fields.getByName('project')) {
          col.fields.remove('project')
        }
        col.removeIndex('idx_' + cols[i] + '_project')
        app.save(col)
      } catch (_) {}
    }
    try {
      app.delete(app.findCollectionByNameOrId('projects'))
    } catch (_) {}
  },
)
