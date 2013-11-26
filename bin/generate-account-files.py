"""
Parses newusers.json and generates two files,
1) newusers.sql - sql statements to create new users in the database.
2) newusers.csv - distributable usernames
"""
import simplejson

sql_file = open('newusers.sql', 'w')
csv_file = open('newusers.csv', 'w')

csv_file.write("Username, Fake email, Password\n")

sql_file.write("""
DROP TEMPORARY TABLE IF EXISTS tempNewAccounts;

CREATE TEMPORARY TABLE tempNewAccounts
(
  username varchar(255),
    email varchar(255),
      password varchar(255)
      );
""")

users = simplejson.load(open('newusers.json','r'))
for user in users:
    sql_file.write("insert into Learners (username, email, password, underage) values ('%s', '%s', '%s', 0);\n" %
                   ( user.get('username'), user.get('email'), user.get('hash') ))
    csv_file.write("%s\n" % ",".join([user.get('username'), user.get('email'), user.get('password')]))

sql_file.write("""
INSERT INTO csol.Learners
  (username, email, password, underage, birthday, createdAt, updatedAt)
  SELECT t.username, t.email, t.password, 0, DATE('1999-01-01'), NOW(), NOW()
  FROM tempNewAccounts t;
""")

sql_file.close()
csv_file.close()
