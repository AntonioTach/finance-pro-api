'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'theme', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'dark',
    });
    await queryInterface.addColumn('users', 'language', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'es',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'theme');
    await queryInterface.removeColumn('users', 'language');
  },
};
