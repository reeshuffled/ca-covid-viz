from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy

# initialize Flask application
app = Flask(__name__, static_folder="../build", static_url_path="/")

# configure and initialize SQLAlchemy database connection
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

class Student(db.Model):
    """
    The Student model that is stored in the SQL database.
    """

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=False, nullable=False)
    marks = db.Column(db.Integer)

@app.route("/")
def index():
    """
    Serve the index.html file which contains the React application.
    """

    return app.send_static_file("index.html")

@app.route("/students", methods=["GET"])
def get_student_data():
    """
    Return the student data on a GET request.
    """

    # get all student objects and create dictionaries to put into a list
    students = []
    for student in Student.query.all():
        students.append({
            "id": student.id,
            "name": student.name,
            "marks": student.marks
        })

    # Flask JSONifies our dictionary with the student list automatically
    return { 
        "students": students 
    }

@app.route("/add-student", methods=["POST"])
def add_student():
    """
    Add a student to the database via a POST request.
    """

    # add student object from request data
    db.session.add(Student(**request.json))

    # save the new student in the database
    db.session.commit()

    return {
        "message": "Student added successfully."
    }

@app.route("/update-student", methods=["POST"])
def update_student():
    """
    Update an existing student's data via a POST request.
    """

    # get existing student object by id from request data
    student = Student.query.get(request.json["id"])

    # update the student's data
    student.id = request.json["newId"]
    student.name = request.json["name"]
    student.marks = request.json["marks"]

    # save the updates to the database
    db.session.commit()

    return {
        "message": "Student updated successfully."
    }

@app.route("/delete-student", methods=["POST"])
def delete_student():
    """
    Delete a student by id via a POST request.
    """

    # start out with a vague error message to default to
    message = "Something went wrong."

    # get the student by id
    student = Student.query.get(request.json["id"])

    # if there is a student with that id in the database, delete it
    if student is not None:
        # set the API message to a successful deletion message
        message = "Deletion successful."

        # delete student and commit to the database
        db.session.delete(student)
        db.session.commit()

    # return a JSON response with a descriptive message
    return {
        "message": message
    }

def init_db():
    """
    Create the SQLite database if necessary.
    """

    # create the database and tables
    db.create_all()

    # starter student data
    student_data = {
        "students": [
            {
                "name": "Joe",
                "id": "21",
                "marks": "90"
            },
            {
                "name": "Jian",
                "id": "22",
                "marks": "92"
            },
            {
                "name": "Chris",
                "id": "23",
                "marks": "90"
            },
            {
                "name": "Sai",
                "id": "24",
                "marks": "95"
            },
            {
                "name": "Andrew",
                "id": "25",
                "marks": "100"
            },
            {
                "name": "Lynn",
                "id": "26",
                "marks": "90"
            },
            {
                "name": "Robert",
                "id": "27",
                "marks": "85"
            }
        ]
    }

    # create student objects for the starter student data
    for student in student_data["students"]:
        db.session.add(Student(**student))
    
    # add the students to the database
    db.session.commit()