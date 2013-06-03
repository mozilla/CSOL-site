var db = require('../db');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
		type: {
			type: db.type.ENUM,
			values: [
				'badge',
				'org',
				'program'
			],
			allowNull: false
		},
		itemId: {
			type: db.type.STRING,
			allowNull: false
		}
	},
	relationships: [
		{
			model: 'Learner',
			type: 'belongsTo'
		}
	]
};
