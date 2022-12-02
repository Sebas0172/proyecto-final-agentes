import numpy as np
import math
from dijkstar import Graph, find_path #pip install Dijkstar
from mesa import Agent, Model
from mesa.space import ContinuousSpace
from mesa.time import RandomActivation
from mesa.visualization.ModularVisualization import ModularServer
from SimpleContinuousModule import SimpleCanvas

class Light(Agent):
    RED = 1
    GREEN = 2
    YELLOW = 3
    def __init__(self, model, pos, color, timmer):
        super().__init__(model.next_id(), model)
        self.pos = pos
        self.color = color
        self.timmer = timmer
        
    def step(self):
        self.timmer += 1
        
        # 10 steps = 1 sec
        if self.timmer == 50 and self.color == self.GREEN:
            self.timmer = 0
            self.color = self.YELLOW
            
        elif self.timmer == 30 and self.color == self.YELLOW:
            self.timmer = 0
            self.color = self.RED
        
        elif self.timmer == 240 and self.color == self.RED:
            self.timmer = 0
            self.color = self.GREEN

class Car(Agent):
    UP = 1
    RIGHT = 2
    DOWN = 3
    LEFT = 4
    def __init__(self, model, initial_speed):
        super().__init__(model.next_id(), model)
        self.pos
        self.initial_speed = initial_speed
        self.speed = np.array([0,0])
        self.orientation = self.RIGHT
        
        self.last = 0
        self.next = 0
        self.path = 0
        self.i = 0
        
        self.init_path()
        
    def step(self):
        
        self.border_limitation()    
        self.rotations()
        
        car_ahead = self.car_ahead()
        light_ahead = self.light_ahead()
        
        # light color reaction
        if light_ahead != None:    
            if light_ahead.color == light_ahead.RED:
                new_speed = self.decelerate_in_red()
            elif light_ahead.color == light_ahead.GREEN:
                new_speed = self.accelerate()
            elif light_ahead.color == light_ahead.YELLOW:
                new_speed = self.decelerate_in_yellow()
        else:
            new_speed = self.accelerate()
            
        if car_ahead != None:
            if self.last not in ("n2", "n5", "n8", "n11"):
                new_speed = self.decelerate_by_car(car_ahead)
                # MODIFICABLE: FRENADO RÁPIDO, EN UN RANGO DE 2 UNIDADES EN X, 1.5 EN Y (AUNQUEDEBERÍASERALREVES,PENDIENTEAJUSTARLO)
                if abs(self.pos[0]-car_ahead.pos[0]) < 2 or abs(self.pos[1]-car_ahead.pos[1]) < 1.5:
                    new_speed = self.hard_down(car_ahead)

        # speed limit
        if new_speed >= 1.0:
            new_speed = 1.0
        elif new_speed <= 0.0:
            new_speed = 0.0
    
        # new pos generator
        # MODIFICABLE: SI VES QUE AVANZAN POCO O MUCHO, CAMBIA EL 0.5 POR CUALQUIER OTRO VALOR
        if self.orientation == self.RIGHT:
            self.speed = np.array([new_speed, 0.0])
            new_pos = self.pos + np.array([0.5, 0.0]) * self.speed
            self.model.space.move_agent(self, new_pos)
        elif self.orientation == self.UP:
            self.speed = np.array([0.0, new_speed])
            new_pos = self.pos + np.array([0.0, -0.5]) * self.speed
            self.model.space.move_agent(self, new_pos)
        elif self.orientation == self.LEFT:
            self.speed = np.array([new_speed, 0.0])
            new_pos = self.pos + np.array([-0.5, 0.0]) * self.speed
            self.model.space.move_agent(self, new_pos)
        elif self.orientation == self.DOWN:
            self.speed = np.array([0.0, new_speed])
            new_pos = self.pos + np.array([0.0, 0.5]) * self.speed
            self.model.space.move_agent(self, new_pos)
    
    def init_path(self):
        self.i = 0
        self.path = find_path(self.model.graph, np.random.choice(self.model.starting), np.random.choice(self.model.ending)).nodes
        self.last = self.path[self.i]
        self.next = self.path[self.i+1]
        self.first_orientation()
        self.model.space.move_agent(self, self.model.nodes[self.last])
    
    def path_handler(self):
        self.last = self.path[self.i]
        if self.i < len(self.path)-1:
            self.i += 1
            self.next = self.path[self.i]
        else:
            self.next = self.path[self.i]
        
    def first_orientation(self):
        if self.path[0] == "n1":
            self.orientation = self.RIGHT
            self.speed = np.array([self.initial_speed,0])
        elif self.path[0] == "n4":
            self.orientation = self.UP
            self.speed = np.array([0,self.initial_speed])
        elif self.path[0] == "n7":
            self.orientation = self.LEFT
            self.speed = np.array([self.initial_speed,0])
        elif self.path[0] == "n10":
            self.orientation = self.DOWN
            self.speed = np.array([0,self.initial_speed])

    def change_orientation(self):
        if self.orientation == self.RIGHT or self.orientation == self.LEFT:
            if self.model.nodes[self.next][1] < self.model.nodes[self.last][1]:
                self.orientation = self.UP
            elif self.model.nodes[self.next][1] > self.model.nodes[self.last][1]:
                self.orientation = self.DOWN
        else:
            if self.model.nodes[self.next][0] > self.model.nodes[self.last][0]:
                self.orientation = self.RIGHT
            elif self.model.nodes[self.next][0] < self.model.nodes[self.last][0]:
                self.orientation = self.LEFT

    def rotations(self):
        if self.orientation == self.RIGHT:
            if self.pos[0] >= self.model.nodes[self.next][0]:
                self.path_handler()
                self.change_orientation()
        elif self.orientation == self.UP:
            if self.pos[1] <= self.model.nodes[self.next][1]:
                self.path_handler()
                self.change_orientation()
        elif self.orientation == self.LEFT:
            if self.pos[0] <= self.model.nodes[self.next][0]:
                self.path_handler()
                self.change_orientation()
        elif self.orientation == self.DOWN:
            if self.pos[1] >= self.model.nodes[self.next][1]:
                self.path_handler()
                self.change_orientation()
        
    def border_limitation(self):
        if self.orientation == self.RIGHT:
            if self.pos[0] >= 47:
                self.init_path()
        elif self.orientation == self.UP:
            if self.pos[1] <= 2:
                self.init_path()
        elif self.orientation == self.LEFT:
            if self.pos[0] <= 2:
                self.init_path()
        elif self.orientation == self.DOWN:
            if self.pos[1] >= 47:
                self.init_path()

    # MODIFICABLE: 5 UNIDADES DE DETECCIÓN HORIZONTALMENTE Y 6 VERTICALMENTE, (PENDIENTE A AJUSTAR)
    def car_ahead(self):
        if self.orientation == self.RIGHT:
            for neighbor in self.model.space.get_neighbors(self.pos, 5):
                if type(neighbor) == Car:
                    if neighbor.pos[0] > self.pos[0]:
                        return neighbor
        elif self.orientation == self.UP:
            for neighbor in self.model.space.get_neighbors(self.pos, 6):
                if type(neighbor) == Car:
                    if neighbor.pos[1] < self.pos[1]:
                        return neighbor
        elif self.orientation == self.LEFT:
            for neighbor in self.model.space.get_neighbors(self.pos, 5):
                if type(neighbor) == Car:
                    if neighbor.pos[0] < self.pos[0]:
                        return neighbor
        elif self.orientation == self.DOWN:
            for neighbor in self.model.space.get_neighbors(self.pos, 6):
                if type(neighbor) == Car:
                    if neighbor.pos[1] > self.pos[1]:
                        return neighbor
        return None
    
    # MODIFICABLE: 7 UNIDADES DE DETECCIÓN DE SEMÁFOROS, ENTRE MAYOR SEA, ANTES VAN A FRENAR (PENDIENTE A AJUSTAR)
    def light_ahead(self):        
        if self.last == "n1":
            correspondant = self.model.schedule.agents[1]
            if correspondant.pos[0]-self.pos[0] <= 7 and correspondant.pos[0]-self.pos[0] > 0:
                return correspondant
        elif self.last == "n4":
            correspondant = self.model.schedule.agents[2]
            if self.pos[1]-correspondant.pos[1] <= 7 and self.pos[1]-correspondant.pos[1] > 0:
                return correspondant
        elif self.last == "n7":
            correspondant = self.model.schedule.agents[3]
            if self.pos[0]-correspondant.pos[0] <= 7 and self.pos[0]-correspondant.pos[0] > 0:
                return correspondant
        elif self.last == "n10":
            correspondant = self.model.schedule.agents[0]
            if correspondant.pos[1]-self.pos[1] <= 7 and correspondant.pos[1]-self.pos[1] > 0:
                return correspondant
        else:
            return None
    
    # MODIFICABLE: RAZÓN DE ACELERADO
    def accelerate(self):
        if self.orientation == self.RIGHT or self.orientation == self.LEFT:
            return self.speed[0] + 0.07
        else:
            return self.speed[1] + 0.07

    # MODIFICABLE: RAZÓN DE FRENADO EN SEMAFORO ROJO
    def decelerate_in_red(self):
        if self.orientation == self.RIGHT or self.orientation == self.LEFT:
            return self.speed[0] - 0.07
        else:
            return self.speed[1] - 0.07
    
    # MODIFICABLE: RAZÓN DE FRENADO EN SEMAFORO AMARILLO
    def decelerate_in_yellow(self):
        if self.orientation == self.RIGHT or self.orientation == self.LEFT:
            return self.speed[0] - 0.02 
        else:
            return self.speed[1] - 0.02

    # MODIFICABLE: RAZÓN DE FRENADO CON UN CARRO ENFRENTE
    def decelerate_by_car(self, car_ahead):
        if self.orientation == self.RIGHT or self.orientation == self.LEFT:
            return car_ahead.speed[0] - 0.1
        else:
            return car_ahead.speed[1] - 0.1

    # MODIFICABLE: LO MISMO QUE ARRIBA PERO PRINCIPALMENTE PARA CUANDO LOS CARROS SE ENCIMAN
    def hard_down(self, car_ahead):
        if self.orientation == self.RIGHT or self.orientation == self.LEFT:
            return car_ahead.speed[0] - 1
        else:
            return car_ahead.speed[1] - 1

class City(Model):
    def __init__(self):
        super().__init__()
        self.space = ContinuousSpace(50.0, 50.0, True)
        self.schedule = RandomActivation(self)
        # MODIFICABLE: COORDENADAS DE LOS NODOS
        self.nodes = {
            "n1": (0, 30),
            "n2": (19.75, 30),
            "n3": (19.75, 49),
            "n4": (30, 49),
            "n5": (30, 30),
            "n6": (49, 30),
            "n7": (49, 19.75),
            "n8": (30, 19.75),
            "n9": (30, 0),
            "n10": (19.75, 0),
            "n11": (19.75, 19.75),
            "n12": (0, 19.75)
        }
        self.starting = ["n1", "n4", "n7", "n10"]
        self.ending = ["n12", "n3", "n6", "n9"]

        self.graph = Graph()
        self.graph.add_edge("n1", "n2", 1)
        self.graph.add_edge("n2", "n3", 1)
        self.graph.add_edge("n2", "n5", 1)
        self.graph.add_edge("n4", "n5", 1)
        self.graph.add_edge("n5", "n6", 1)
        self.graph.add_edge("n5", "n8", 1)
        self.graph.add_edge("n7", "n8", 1)
        self.graph.add_edge("n8", "n9", 1)
        self.graph.add_edge("n8", "n11", 1)
        self.graph.add_edge("n10", "n11", 1)
        self.graph.add_edge("n11", "n2", 1)
        self.graph.add_edge("n11", "n12", 1)
            
        self.spawnLights()
        
        # MODIFICABLE: CAMTODAD DE CARRPS Y VELOCIDAD INICIAL 0.5
        for _ in range(5):
            car = Car(self, 0.5)
            self.space.place_agent(car, car.pos)
            self.schedule.add(car)
  
    def spawnLights(self):
        light1 = Light(self, (15, 15), Light.GREEN, 0)
        self.space.place_agent(light1, light1.pos)
        self.schedule.add(light1)
        
        light2 = Light(self, (15, 35), Light.RED, 160)
        self.space.place_agent(light2, light2.pos)
        self.schedule.add(light2)
        
        light3 = Light(self, (35, 35), Light.RED, 80)
        self.space.place_agent(light3, light3.pos)
        self.schedule.add(light3)
        
        light4 = Light(self, (35, 15), Light.RED, 0)
        self.space.place_agent(light4, light4.pos)
        self.schedule.add(light4)

    def step(self):
        self.schedule.step()

def draw(agent):
    if type(agent) == Light:
        if agent.color == 1:
           color = "Red"
        elif agent.color == 2:
            color = "Green"
        elif agent.color == 3:
            color = "Yellow"
        return {"Shape": "rect", "w": 0.05, "h": 0.05, "Filled": "true", "Color": color}
    elif type(agent) == Car:
        if agent.orientation == agent.RIGHT or agent.orientation == agent.LEFT:
           return {"Shape": "rect", "w": 0.08, "h": 0.033, "Filled": "true", "Color": "Brown"}
        else:
            return {"Shape": "rect", "w": 0.033, "h": 0.08, "Filled": "true", "Color": "Brown"}

canvas = SimpleCanvas(draw, 500, 500)

model_params = {}

server = ModularServer(City, [canvas], "City Model", model_params)
server.port = 8522
server.launch()