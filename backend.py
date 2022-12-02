import flask
from flask_cors import CORS
from flask.json import jsonify
import uuid
import os 
from rotonda import *

games = {}

app = flask.Flask(__name__)
CORS(app)

port = int(os.getenv('PORT', 8000))

@app.route('/')
def root():
    return jsonify ([{"message" : "Hola, desde IBM Cloud, por favor funciona!!"}])


@app.route("/games", methods=["POST"])
def create():
    global games
    id = str(uuid.uuid4())
    games[id] = City()

    response = jsonify("ok")
    response.status_code = 201
    response.headers['Location'] = f"/games/{id}"
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.autocorrect_location_header = False
    return response

@app.route("/games/<id>", methods=["GET"])
def queryState(id):
    global model
    model = games[id]
    model.step()
    dictionary = {}
    cars = []
    lights = []
    for agent in model.schedule.agents:
        if type(agent) is Car:
            car = dict()
            car["id"] = agent.unique_id
            car["x"] = agent.pos[0]
            car["y"] = agent.pos[1]
            car["orient"] = agent.orientation
            cars.append(car)

        elif type(agent) is Light:
            light = dict()
            light["id"] = agent.unique_id
            light["color"] = agent.color
            lights.append(light)

    dictionary["cars"] = cars
    dictionary["lights"] = lights

    return jsonify(dictionary)

app.run()