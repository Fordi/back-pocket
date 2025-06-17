// Like Unity's Quaternion.LookRotation.  forward/up equivalent to camera's .direction/.up
const xLeft = new Cesium.Cartesian3();
const yUp = new Cesium.Cartesian3();
const zForward = new Cesium.Cartesian3();
const orientationMatrix = new Cesium.Matrix3();

const lookRotation = ({ direction, up }, result = new Cesium.Quaternion()) => {
  // Build axes
  // zForward = || zForward ||
  Cesium.Cartesian3.normalize(direction, zForward);
  // yUp = || yUp ||
  Cesium.Cartesian3.normalize(up, yUp);
  // xLeft = || yUp × zForward ||
  Cesium.Cartesian3.cross(up, zForward, xLeft);
  Cesium.Cartesian3.normalize(xLeft, xLeft); 
  // yUp (true) = xForward × xLeft
  Cesium.Cartesian3.cross(zForward, xLeft, yUp);
  
  // Pack Matrix
  Cesium.Matrix3.fromArray([
    xLeft.x, yUp.x, zForward.x,
    xLeft.y, yUp.y, zForward.y,
    xLeft.z, yUp.z, zForward.z,
  ], 0, orientationMatrix);

  Cesium.Quaternion.fromRotationMatrix(orientationMatrix, result);
  return result;
};

/* ----- */

const viewer = new Cesium.Viewer("cesiumContainer");

// Just copy the frustum from the camera for now
const frustum = viewer.camera.frustum;

// The one we want to see from the real camera
const cameraToSee = {
  origin: new Cesium.Cartesian3(1238331.0252910198,-4714708.526909457,4099594.523282861),
  orientation: {
    direction: new Cesium.Cartesian3(-0.7419313985173208,0.6595880524556975,-0.1203386926629691),
    up: new Cesium.Cartesian3(-0.4701037294109632,-0.38378363967093604,0.7948034986805438),
  },
};

// Where we want to watch it from
const cameraToBe = {
  origin: new Cesium.Cartesian3(1238253.6298707463, -4715047.732849047, 4099300.5863231933),
  orientation: {
    direction: new Cesium.Cartesian3(0.04622840387575757, 0.8427405399429015, 0.5363313500177356),
    up: new Cesium.Cartesian3(0.2139434439637619, -0.5327997140333419, 0.8187506748155472),
  }
};

const mockCamera = new Cesium.GeometryInstance({
    geometry: new Cesium.FrustumGeometry({
    frustum,
    origin: cameraToSee.origin,
    orientation: lookRotation(cameraToSee.orientation),
  }),
  attributes : {
    color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 1.0, 1.0, 1.0))
  },
  id : 'myFrustum'
});

console.log(mockCamera);

// Add the geometry
viewer.scene.primitives.add(new Cesium.Primitive({
  geometryInstances: mockCamera,
  appearance: new Cesium.MaterialAppearance({
    material: Cesium.Material.fromType('Checkerboard'),
  }),
}));

viewer.camera.flyTo({ 
  destination: cameraToBe.origin,
  orientation: cameraToBe.orientation,
});
