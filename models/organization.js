const db = require('../db.js');

var Organization = db.define('Organization', {
  id: { type: db.type.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: db.type.STRING, allowNull: false, unique: true },
  description: { type: db.type.STRING, allowNull: false, unique: true },
  url: { type: db.type.STRING, allowNull: false, validate: { isUrl: true }},
  imageUrl: { type: db.type.TEXT, allowNull: false, validate: { isUrl: true }},
  address: { type: db.type.TEXT, allowNull: true },
  phone: { type: db.type.STRING, allowNull: true },
  email: { type: db.type.STRING, allowNull: true, validate: { isEmail: true }}
},  
{ 
  instanceMethods: {
    detailUrl: function() { return "/orgs/" + this.id }
  }
}
);


Organization.sync().success(function () {
  console.log('created `Organization` table');
}).error(function (error) {
  console.log('could not create `Organization` table:');
  console.dir(error);
  process.exit(1);
});

module.exports = Organization;
