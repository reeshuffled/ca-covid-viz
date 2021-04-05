from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
import csv

# initialize Flask application
app = Flask(__name__, static_url_path="")

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
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(80))
    county = db.Column(db.String(80))
    cases = db.Column(db.Integer)
    deaths = db.Column(db.Integer)

@app.route("/")
def index():
    return app.send_static_file("map.html")

@app.route("/date", methods=["POST"])
def get_data_by_date():
    """
    Responds to POST requests with a JSON with date: "YYYY-MM-DD".
    """

    # error checking to make sure there is a date
    if "date" not in request.json:
        return "You need to supply a date in your request JSON body.", 400 

    # get existing student object by id from request data
    results = Day.query.filter_by(date=request.json["date"]).all()

    # convert Day objects into dictionaries that are easily JSON-ified
    data = []
    for result in results:
        entry = {
            "date": result.date,
            "county": result.county,
            "cases": result.cases,
            "deaths": result.deaths
        }

        data.append(entry)

    # return a JSON with the data that was found
    return {
        "data": data
    }

def init_db():
    db.create_all()

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