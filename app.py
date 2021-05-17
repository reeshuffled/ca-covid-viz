from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import csv, requests
from geojson import Point, Feature, FeatureCollection, dump
import os

# initialize Flask application
app = Flask(__name__, static_url_path="")

# configure and initialize SQLAlchemy database connection
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

COUNTY_URL = "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv"
PRISON_URL = "https://raw.githubusercontent.com/uclalawcovid19behindbars/historical-data/main/data/CA-historical-data.csv"

# constants for the county CSV file
DATE_INDEX = 0
COUNTY_INDEX = 1
STATE_INDEX = 2
CASES_INDEX = 4
DEATHS_INDEX = 5

#county database initialization and variables
class Day(db.Model):
    """
    The Student model that is stored in the SQL database.
    """
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(80))
    county = db.Column(db.String(80))
    state = db.Column(db.String(80))
    cases = db.Column(db.Integer)
    deaths = db.Column(db.Integer)

# constants for the prison CSV file
FACILITY_ID = 0
PRSN_STATE = 2
PRSN_NAME = 3
PRSN_DATE = 4
PRSN_RES_CONF = 6
PRSN_STAFF_CONF = 7
PRSN_RES_DEATHS = 8
PRSN_STAFF_DEATHS = 9
PRSN_RES_REC = 10
PRSN_STAFF_REC = 11
PRSN_POP_FEB20 = 21
PRSN_RES_POP = 22
PRSN_COUNTY = 33
PRSN_LAT = 34
PRSN_LON = 35

#prison database initialization and variables
class Prison(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    facilityID = db.Column(db.Integer)
    state = db.Column(db.String(80))
    name = db.Column(db.String(80))
    date = db.Column(db.String(80))
    residentsConfirmed = db.Column(db.Integer)
    staffConfirmed = db.Column(db.Integer)
    residentsDeaths = db.Column(db.Integer)
    staffDeaths= db.Column(db.Integer)
    residentsRecovered = db.Column(db.Integer)
    staffRecovered = db.Column(db.Integer)
    popFebTwenty = db.Column(db.Integer)
    residentsPopulation= db.Column(db.Integer)
    county = db.Column(db.String(80))
    latitude = db.Column(db.Integer)
    longitude = db.Column(db.Integer)

#home rounty, return index.html
@app.route("/")
def index():
    return app.send_static_file("index.html")

#function that responds to POST requests with a JSON with date: "YYYY-MM-DD".
@app.route("/date", methods=["POST"])
def get_data_by_date():

    # error checking to make sure there is a date
    if "date" not in request.json:
        return "You need to supply a date in your request JSON body.", 400 

    # get the latest and ealier dates in the database
    earliest_date = Day.query.order_by(Day.id)[1].date
    latest_date = Day.query.order_by(-Day.id).first().date
    earliest_date_obj = datetime.strptime(earliest_date, "%Y-%m-%d")
    latest_date_obj = datetime.strptime(latest_date, "%Y-%m-%d") 

    # get existing student object by id from request data
    county_date = request.json["date"]

    # rollback/forward to data within the database
    date = datetime.strptime(county_date, "%Y-%m-%d")
    if date > latest_date_obj:
        county_date = latest_date

    county_results = Day.query.filter_by(date=county_date).all()

    # roll back date until there are entries in the DB
    while len(list(county_results)) == 0:
        # convert the date string to a datetime object
        date_obj = datetime.strptime(county_date, "%Y-%m-%d")

        if date_obj < earliest_date_obj:
            break

        # roll back one day and convert back to string
        date_obj -= timedelta(days=1)
        county_date = datetime.strftime(date_obj, "%Y-%m-%d")

        # check database to see if there are entries for this date
        county_results = Day.query.filter_by(date=county_date).all()

    # convert Day objects into dictionaries that are easily JSON-ified
    county_data = []
    for result in county_results:
        entry = {
            "date": result.date,
            "county": result.county,
            "state": result.state,
            "cases": result.cases,
            "deaths": result.deaths
        }

        county_data.append(entry)

    # get existing student object by id from request data
    prison_date = request.json["date"]

    # rollback to data within the database
    date = datetime.strptime(prison_date, "%Y-%m-%d")
    if date > latest_date_obj:
        prison_date = latest_date

    prison_results = Prison.query.filter_by(date=prison_date).all()

    # roll back date until there are entries in the DB
    while len(list(prison_results)) == 0:
        # convert the date string to a datetime object
        date_obj = datetime.strptime(prison_date, "%Y-%m-%d")

        if date_obj < earliest_date_obj:
            break

        # roll back one day and convert back to string
        date_obj -= timedelta(days=1)
        prison_date = datetime.strftime(date_obj, "%Y-%m-%d")

        # check database to see if there are entries for this date
        prison_results = Prison.query.filter_by(date=prison_date).all()

    # convert Prison objects into dictionaries that are easily JSON-ified
    prison_data = []
    for result in prison_results:
        entry = {
            "id": result.id,
            "facilityID": result.facilityID,
            "state": result.state,
            "name": result.name,
            "date": result.date,
            "residentsConfirmed": result.residentsConfirmed,
            "staffConfirmed": result.staffConfirmed,
            "residentsDeaths": result.residentsDeaths,
            "staffDeaths": result.staffDeaths,
            "residentsRecovered": result.residentsRecovered,
            "staffRecovered": result.staffRecovered,
            "popFebTwenty": result.popFebTwenty,
            "residentsPopulation": result.residentsPopulation,
            "county": result.county,
            "latitude": result.latitude,
            "longitude": result.longitude,
        }

        prison_data.append(entry)

    # return a JSON with the data that was found
    return {
        "countyDataDate": county_date,
        "countyData": county_data,
        "prisonDataDate": prison_date,
        "prisonData": prison_data
    }

#This function is utilized whenever the database needs to be initialized or updated
def init_db():

    #create a new database...
    db.create_all()

    # ... and perform a web request for the data stored at the source we were given for US county Covid data
    r = requests.get(COUNTY_URL)

    #decode the info, split each variable by ',' and store the result as a list
    decoded_content = r.content.decode('utf-8')
    cr = csv.reader(decoded_content.splitlines(), delimiter=',')
    cali_data = list(cr)

    # for each county we have information on...
    for entry in cali_data:

        # ... record county name, state, cases, deaths, and date the information was from
        data = {
            "date": entry[DATE_INDEX],
            "county": entry[COUNTY_INDEX],
            "state": entry[STATE_INDEX],
            "cases": entry[CASES_INDEX],
            "deaths": entry[DEATHS_INDEX]
        }

        # create a County object and add to the database
        db.session.add(Day(**data))

        # save the new county in the database
        db.session.commit()

       # Perform a web request for the data stored at the source we were given for CA Prison Data
    r = requests.get(PRISON_URL)

    
    #decode the info, split each variable by ',' and store the result as a list
    decoded_content = r.content.decode('utf-8')
    cr = csv.reader(decoded_content.splitlines(), delimiter=',')
    prison_data = list(filter(lambda x: x[PRSN_STATE] == "California", cr))

    # create DB objects for each CA prison entry from the list 
    for entry in prison_data:

        # record all neccecary info for each prison
        data = {

            "facilityID": entry[FACILITY_ID],
            "state": entry[PRSN_STATE],
            "name": entry[PRSN_NAME],
            "date": entry[PRSN_DATE],
            "residentsConfirmed": entry[PRSN_RES_CONF],
            "staffConfirmed": entry[PRSN_STAFF_CONF],
            "residentsDeaths": entry[PRSN_RES_DEATHS],
            "staffDeaths": entry[PRSN_STAFF_DEATHS],
            "residentsRecovered": entry[PRSN_RES_REC],
            "staffRecovered": entry[PRSN_STAFF_REC],
            "popFebTwenty": entry[PRSN_POP_FEB20], 
            "residentsPopulation": entry[PRSN_RES_POP], 
            "county": entry[PRSN_COUNTY],
            "latitude": entry[PRSN_LAT],
            "longitude": entry[PRSN_LON]
        }

        # create a Prison object and add to the database
        db.session.add(Prison(**data))

        # save the new prison in the database
        db.session.commit()

#function that was utilized to create a prison GEOJSON for the map
def create_pointers():
    with open("CA-historical-data.csv") as csvfile:
        # create a CSV reader for the file
        reader = csv.reader(csvfile)

        prison_data = list(filter(lambda x: x[PRSN_STATE] == "California", reader))

    features = []
    
    # create DB objects for each CA entry from the CSV file
    pairs = []

    for entry in prison_data:
        if [entry[PRSN_LAT], entry[PRSN_LON]] not in pairs and entry[PRSN_LAT] != "NA":
            point = Point((float(entry[PRSN_LON]), float(entry[PRSN_LAT])))

            features.append(Feature(geometry=point, properties={
                "kind": "prison",
                "name": entry[PRSN_NAME],
                "facilityID": entry[FACILITY_ID]
            }))

            pairs.append([entry[PRSN_LAT], entry[PRSN_LON]])
                
    feature_collection = FeatureCollection(features)

    with open('myfile.geojson', 'w') as f:
        dump(feature_collection, f)


#function we used to convert all of the counties for each state into a single GeoJson File
def conv_states_to_file():

    basepath = './USA' # store the file basepath...

    # .. and for all directories in the path, create a new .js file that will contain all counties for a given state
    for dir_name in os.listdir(basepath):

        dir_path = os.path.join(basepath, dir_name)

        if not os.path.isdir(dir_path):
            continue

        # create new state file, write all counties for a state in it
        with open( dir_path + '.js' , 'a') as outfile:

            # ignore any unneccesary files in the path
            for file_name in os.listdir(dir_path):
                if not file_name.endswith('.geo.json'):
                    continue

                file_path = os.path.join(dir_path, file_name)

                with open(file_path) as infile:

                    for line in infile:

                        outfile.write(line)

                outfile.write(',')