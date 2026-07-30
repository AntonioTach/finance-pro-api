'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('transactions', ['card_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('transactions', ['card_id']);
  },
};
