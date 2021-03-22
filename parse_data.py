from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
import csv

# initialize Flask application
app = Flask(__name__)

# configure and initialize SQLAlchemy database connection
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# constants for the CSV file
DATE_INDEX = 0
COUNTY_INDEX = 1
STATE_INDEX = 2
CASES_INDEX = 4
DEATHS_INDEX = 5

class Day(db.Model):
    """
    The Student model that is stored in the SQL database.
    """

    county = db.Column(db.String(80))
    cases = db.Column(db.Integer)
    deaths = db.Column(db.Integer)

# open the csv data file
with open("us-counties.csv") as csvfile:
    # create a CSV reader for the file
    reader = csv.reader(csvfile)

    # get only the CA entries
    cali_data = list(filter(lambda x: x[STATE_INDEX] == "California", reader))

    # create DB objects for each CA entry from the CSV file
    for entry in cali_data:
        # record county name, daily cases, and daily deaths
        data = {
            "date": entry[DATE_INDEX],
            "county": entry[COUNTY_INDEX],
            "cases": entry[CASES_INDEX],
            "deaths": entry[DEATHS_INDEX]
        }

        # create a Day object and add to the database
        db.session.add(Day(**data))

    # save the new student in the database
    db.session.commit()