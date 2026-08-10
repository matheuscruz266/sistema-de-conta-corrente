migrate(
  (app) => {
    const transactions = new Collection({
      name: 'transactions',
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
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'category', type: 'text' },
        { name: 'date', type: 'date', required: true },
        { name: 'source_file', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transactions_user ON transactions (user)',
        'CREATE INDEX idx_transactions_date ON transactions (date)',
        'CREATE INDEX idx_transactions_type ON transactions (type)',
        'CREATE INDEX idx_transactions_category ON transactions (category)',
      ],
    })
    app.save(transactions)

    const extratos = new Collection({
      name: 'extratos',
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
        { name: 'filename', type: 'text', required: true },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'transactions_count', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_extratos_user ON extratos (user)',
        'CREATE INDEX idx_extratos_created ON extratos (created)',
      ],
    })
    app.save(extratos)

    const categories = new Collection({
      name: 'categories',
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
        { name: 'color', type: 'text' },
        { name: 'icon', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_categories_user ON categories (user)',
        'CREATE INDEX idx_categories_name ON categories (name)',
      ],
    })
    app.save(categories)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('categories'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('extratos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('transactions'))
    } catch (_) {}
  },
)
