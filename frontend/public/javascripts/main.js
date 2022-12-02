import * as THREE from '../javascripts/three.module.js';
import { OBJLoader } from '../javascripts/OBJLoader.js';
import { MTLLoader } from '../javascripts/MTLLoader.js';
import { GLTFLoader } from '../javascripts/GLTFLoader.js';

/** @namespace */
var THREEx	= THREEx 		|| {};

THREEx.KeyboardState	= function()
{
	// to store the current state
	this.keyCodes	= {};
	this.modifiers	= {};
	
	// create callback to bind/unbind keyboard events
	var self	= this;
	this._onKeyDown	= function(event){ self._onKeyChange(event, true); };
	this._onKeyUp	= function(event){ self._onKeyChange(event, false);};

	// bind keyEvents
	document.addEventListener("keydown", this._onKeyDown, false);
	document.addEventListener("keyup", this._onKeyUp, false);
}

THREEx.KeyboardState.prototype.destroy	= function()
{
	// unbind keyEvents
	document.removeEventListener("keydown", this._onKeyDown, false);
	document.removeEventListener("keyup", this._onKeyUp, false);
}

THREEx.KeyboardState.MODIFIERS	= ['shift', 'ctrl', 'alt', 'meta'];
THREEx.KeyboardState.ALIAS	= {
	'left'		: 37,
	'up'		: 38,
	'right'		: 39,
	'down'		: 40,
	'space'		: 32,
	'pageup'	: 33,
	'pagedown'	: 34,
	'tab'		: 9
};

THREEx.KeyboardState.prototype._onKeyChange	= function(event, pressed){
	// update this.keyCodes
	var keyCode		= event.keyCode;
	this.keyCodes[keyCode]	= pressed;

	// update this.modifiers
	this.modifiers['shift']= event.shiftKey;
	this.modifiers['ctrl']	= event.ctrlKey;
	this.modifiers['alt']	= event.altKey;
	this.modifiers['meta']	= event.metaKey;
}

/**
 * query keyboard state to know if a key is pressed of not
 *
 * @param {String} keyDesc the description of the key. format : modifiers+key e.g shift+A
 * @returns {Boolean} true if the key is pressed, false otherwise
*/
THREEx.KeyboardState.prototype.pressed	= function(keyDesc){
	var keys	= keyDesc.split("+");
	for(var i = 0; i < keys.length; i++){
		var key		= keys[i];
		var pressed;
		if( THREEx.KeyboardState.MODIFIERS.indexOf( key ) !== -1 ){
			pressed	= this.modifiers[key];
		}else if( Object.keys(THREEx.KeyboardState.ALIAS).indexOf( key ) != -1 ){
			pressed	= this.keyCodes[ THREEx.KeyboardState.ALIAS[key] ];
		}else {
			pressed	= this.keyCodes[key.toUpperCase().charCodeAt(0)]
		}
		if( !pressed)	return false;
	};
	return true;
}

var location2 = "";
var baseURL = 'http://localhost:5000'
var OBJ_URL = 'http://localhost:3000/OBJModels/'
var GLB_URL = 'http://localhost:3000/GLBModels/'

var scene, camera, renderer;
var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
const mtlLoader = new MTLLoader();

var cars = {}
var tLights = {}
var drivers = {}

init();

function init() {
	//FETCH
	fetch(baseURL + "/games", {	
		method: "POST"
	}).then(response => {	
		location2 = response.headers.get('Location');
	});

    //SCENE
    scene = new THREE.Scene();

    //CAMERA
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
    camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(0,150,400);
    camera.lookAt(scene.position);

    //RENDERER
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    document.body.appendChild(renderer.domElement);

    //ABIENT LIGHT 
	const light = new THREE.DirectionalLight(0x404040, 3.5);
	light.position.set(60, 200, 0);
	light.target.position.set(-500, 1, 0);
	const light2 = new THREE.DirectionalLight(0x404040, 3.5);
	light2.position.set(-60, 200, 0);
	light2.target.position.set(500, 1, 0);
	const light3 = new THREE.DirectionalLight(0x404040, 3.5);
	light3.position.set(0, 200, 60);
	light3.target.position.set(0, 1, -500);
	const light4 = new THREE.DirectionalLight(0x404040, 3.5);
	light.position.set(0, 200, -60);
	light4.target.position.set(0, 1, 500);

	scene.add(light);
	scene.add(light.target);
	scene.add(light2);
	scene.add(light2.target);
	scene.add(light3);
	scene.add(light3.target);
	scene.add(light4);
	scene.add(light4.target);

    //SKYBOX/FOG
    var skyBoxGeometry = new THREE.BoxGeometry( 1000, 1000, 1000 );
    var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x9999ff, side: THREE.BackSide } );
    var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
    scene.add(skyBox);

    //Create cube that camera follows
    const geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
    const material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
    MovingCube = new THREE.Mesh( geometry, material );
    MovingCube.position.set(0, 150, -400);
	MovingCube.rotation.set(0,3.14159,0);
    scene.add( MovingCube );

	//FLOOR
    const planeSize = 2000;

    const loader = new THREE.TextureLoader();
    const texture = loader.load('http://localhost:3000/images/prettyGrass.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize/10;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
    	map: texture,
    	side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -.5;
    scene.add(mesh);

	//TRAFFIC LIGHT
	for (let i = 1; i < 5; i++) {
		tLights[i] = loadGLB(GLB_URL + 'TLightB.glb')
		tLights[i].scale.setScalar(0.04924245839)
	}
	tLights[1].position.set(-200,0,-130)
	tLights[1].rotateY(1.5708)
	
	tLights[2].position.set(-130,0,200)
	tLights[2].rotateY(3.14159)

	tLights[3].position.set(200,0,130)
	tLights[3].rotateY(4.71239)

	tLights[4].position.set(130,0,-200)
	

    scene.add(tLights[1])
	scene.add(tLights[2])
	scene.add(tLights[3])
	scene.add(tLights[4])
	

	//BANANA CAR
	for (let i = 5; i < 10; i++) {
		cars[i] = loadOBJ(OBJ_URL + 'Car.obj', OBJ_URL + 'Car.mtl', mtlLoader); 
		cars[i].scale.setScalar(0.049518799988);
		cars[i].position.set(35, 14.8, -135);
		scene.add(cars[i]);
	}

	//AVOCADO PEOPLE

	
	//PUG
	var pug = loadGLB(GLB_URL + 'Pug.glb')
	pug.scale.setScalar(1.33795320119)
    pug.position.set(145, 11.25, 150)
	scene.add(pug)

	//LAMPS
	var lamp1 = loadGLB(GLB_URL + 'Lamp.glb')
	var lamp2 = loadGLB(GLB_URL + 'Lamp.glb')
	var lamp3 = loadGLB(GLB_URL + 'Lamp.glb')
	var lamp4 = loadGLB(GLB_URL + 'Lamp.glb')
	lamp1.scale.setScalar(8.1537250028)
    lamp1.position.set(0,52,110)
	lamp1.rotateY(1.5708)

	lamp2.scale.setScalar(8.1537250028)
    lamp2.position.set(0,52,-110)
	lamp2.rotateY(1.5708)

	lamp3.scale.setScalar(8.1537250028)
    lamp3.position.set(110,52,0)
	
	lamp4.scale.setScalar(8.1537250028)
    lamp4.position.set(-110,52,0)

    scene.add(lamp1)
	scene.add(lamp2)
	scene.add(lamp3)
	scene.add(lamp4)

	//FOUNTAIN LAMP
	var fLamp = loadGLB(GLB_URL + 'Lamp2.glb')
	fLamp.scale.setScalar(32.8020994481)
    fLamp.position.set(0, 63, 0)
	scene.add(fLamp)

	//WOMAN 1
	var woman1 = loadGLB(GLB_URL + 'Woman.glb')
	woman1.scale.setScalar(7)
    woman1.position.set(115, 11.25, 125)
	woman1.rotateY(0.785398)
	scene.add(woman1)

	//WIENER CAR
	var wCar = loadGLB(GLB_URL + 'WienerCar.glb')
	wCar.scale.setScalar(45)
    wCar.position.set(-163, 22.5, -110)
	wCar.rotateY(4.97419)
	scene.add(wCar)

	//WOMAN 2
	var woman2 = loadGLB(GLB_URL + 'Woman2.glb')
	woman2.scale.setScalar(3)
    woman2.position.set(-130, 11.25, -110)
	woman2.rotateY(4.38)
	scene.add(woman2)

	//MAN
	var man = loadGLB(GLB_URL + 'Man.glb')
	man.scale.setScalar(7.9)
    man.position.set(-188, 11.25, -107)
	man.rotateY(1.7)
	scene.add(man)

	//MAN2
	var man2 = loadGLB(GLB_URL + 'Man2.glb')
	man2.scale.setScalar(16.2)
    man2.position.set(-145, 11.25, 110)
	man2.rotateY(1.7)
	scene.add(man2)

	//PORPOL FLOWERS
	var pFlower1 = loadGLB(GLB_URL + 'FlowerP.glb')
	var pFlower2 = loadGLB(GLB_URL + 'FlowerP.glb')
	var pFlower3 = loadGLB(GLB_URL + 'FlowerP.glb')
	var pFlower4 = loadGLB(GLB_URL + 'FlowerP.glb')
	pFlower1.scale.setScalar(3.8)
    pFlower1.position.set(-143, 15, 150)
	pFlower1.rotateY(1.7)

	pFlower2.scale.setScalar(3.9)
    pFlower2.position.set(180, 15, -6)
	pFlower2.rotateY(3)

	pFlower3.scale.setScalar(3.6)
    pFlower3.position.set(185, 15, -1)
	pFlower3.rotateY(1)

	pFlower4.scale.setScalar(4)
    pFlower4.position.set(-108, 15, -195)
	pFlower4.rotateY(1)
	
	scene.add(pFlower1)
	scene.add(pFlower2)
	scene.add(pFlower3)
	scene.add(pFlower4)

	//PLANT


	//INTERSECTION
	mtlLoader.setMaterialOptions( { side: THREE.DoubleSide } );
	var inter = loadOBJ(OBJ_URL + "Intersection.obj", OBJ_URL + "Intersection.mtl", mtlLoader);
	inter.scale.setScalar(31.3660662248);
    inter.position.set(0, 0, 0);
	scene.add(inter);

	const covers = {}
	for (let i = 0; i < 8; i++) {
		covers[i] = new THREE.Mesh(
			new THREE.BoxGeometry(30, 1, 120),
			new THREE.MeshBasicMaterial({ color: 0x060606  })
		);
		if (i >= 4){
			covers[i].rotateY(1.5708)
		}
	}
	
	covers[0].position.set(50,4.15,183)
	covers[1].position.set(-50,4.15,183)
	covers[2].position.set(50,4.15,-183)
	covers[3].position.set(-50,4.15,-183)
	covers[4].position.set(183,4.15,50)
	covers[5].position.set(-183,4.15,50)
	covers[6].position.set(183,4.15,-50)
	covers[7].position.set(-183,4.15,-50)

	for (let i = 0; i < 8; i++) {
		scene.add(covers[i])
	}
	
}

//Function to load GLB files
function loadGLB(URL) {
	const obj = new THREE.Object3D();
	const gltfLoader = new GLTFLoader();
  	gltfLoader.load(URL, (gltf) => {
		//var boxVector = new THREE.Vector3();
		//var box = new THREE.Box3().setFromObject(gltf.scene);
		//box.getSize(boxVector);
		//console.log(boxVector.x);
		//console.log(boxVector.y);
		//console.log(boxVector.z);
  		obj.add(gltf.scene);
  	});
	return obj;
}

function loadOBJ(oURL, mURL, loader){
	var obj = new THREE.Object3D(); 
	loader.load(
		mURL,
		(materials) => {
			materials.preload()
			const objLoader = new OBJLoader()
			objLoader.setMaterials(materials)
			objLoader.load(
				oURL,
				(object) => {
					obj.add(object)
				},
				(xhr) => {console.log((xhr.loaded / xhr.total) * 100 + '% loaded')},
				(error) => {console.log('An error happened')}
			)
		},
		(xhr) => {console.log((xhr.loaded / xhr.total) * 100 + '% loaded')},
		(error) => {console.log('An error happened')}
	)
	return obj
}

var MovingCube;

function update() {
	var delta = clock.getDelta(); // seconds.
	var moveDistance = 100 * delta; // 200 pixels per second
	var rotateAngle = Math.PI / 2 * delta;   // pi/2 radians (90 degrees) per second

	// local transformations
	// move forwards/backwards/left/right
	if ( keyboard.pressed("W") )
		MovingCube.translateZ( -moveDistance );
	if ( keyboard.pressed("S") )
		MovingCube.translateZ(  moveDistance );
	if ( keyboard.pressed("A") )
		MovingCube.translateX( -moveDistance );
	if ( keyboard.pressed("D") )
		MovingCube.translateX(  moveDistance );	
	if ( keyboard.pressed("X") )
		MovingCube.translateY( -moveDistance );
	if ( keyboard.pressed("C") )
		MovingCube.translateY(  moveDistance );	

	// rotate left/right/up/down
	var rotation_matrix = new THREE.Matrix4().identity();
	if ( keyboard.pressed("Q") )
		MovingCube.rotateOnAxis( new THREE.Vector3(0,1,0), rotateAngle);
	if ( keyboard.pressed("E") )
		MovingCube.rotateOnAxis( new THREE.Vector3(0,1,0), -rotateAngle);
	if ( keyboard.pressed("R") )
		MovingCube.rotateOnAxis( new THREE.Vector3(1,0,0), rotateAngle);
	if ( keyboard.pressed("F") )
		MovingCube.rotateOnAxis( new THREE.Vector3(1,0,0), -rotateAngle);
	
	if ( keyboard.pressed("Z") ){
		MovingCube.position.set(0,150,400);
		MovingCube.rotation.set(0,0,0);
	}
	
	var relativeCameraOffset = new THREE.Vector3(0,10,40);

	var cameraOffset = relativeCameraOffset.applyMatrix4( MovingCube.matrixWorld );

	camera.position.x = cameraOffset.x;
	camera.position.y = cameraOffset.y;
	camera.position.z = cameraOffset.z;
	camera.lookAt( MovingCube.position );
}

const frame_rate = 200; 
var previous_time = Date.now();

var render = async function () { 
	var now, elapsed_time;

  	now = Date.now();
  	elapsed_time = now - previous_time;

  	//console.log("elapsed time", elapsed_time);

  	
    requestAnimationFrame( render );
	if (elapsed_time >= frame_rate) {
		if (location2 != ""){
			var res = await fetch(baseURL + location2);
			var data = await res.json();
			data.cars.map((d) => {
				var c = cars[d.id]
				//console.log({x: d.x})
				//console.log({z: d.y})
				console.log(c.quaternion)
				c.position.x = (d.x * 10) - 250
				c.position.z = (d.y * 9) - 230
				if (d.orient == 1){
					c.rotation.y = 3.14159					
				}
				else if (d.orient == 2) {
					c.rotation.y = 1.5708
				}
				else if (d.orient == 3){
					c.rotation.y = 0
				}
				else {
					c.rotation.y = 4.71239
				}
				return;
			});
			data.lights.map((d) => {
				var l = tLights[d.id]
				return;
			});
		}
		previous_time = now;
	}
	renderer.render( scene, camera );
    update();
}

render();