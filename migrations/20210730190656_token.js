
exports.up = function(knex) {
  return knex.schema
  .createTable('token', table => {
    
    table
      .increments('id')
      .primary()

    table
      .string('guid')
      .index()
      .unique();

    table
      .boolean('isAssigned')

    table
      .timestamp('assignedAt')

    table
      .timestamp('refreshedAt')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('token');
};
