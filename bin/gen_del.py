import csv

output = open('deleter.sql', 'w')

with open('deleteaccts.csv') as accts:
    reader = csv.DictReader(accts)
    for row in reader:
        output.write("delete from Learners where email = '%s';\n" % row['Fake email'])

output.close()
