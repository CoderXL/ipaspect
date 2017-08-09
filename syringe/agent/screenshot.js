/* jshint node: true, esnext: true */
/* global ObjC, NativeFunction, Process, Memory, Module, rpc */

const base64 = require('base64-js');

const UIWindow = ObjC.classes.UIWindow;
const CGFloat = (Process.pointerSize === 4) ? 'float' : 'double';
const CGSize = [CGFloat, CGFloat];

const UIGraphicsBeginImageContextWithOptions = new NativeFunction(
  Module.findExportByName('UIKit', 'UIGraphicsBeginImageContextWithOptions'),
  'void',
  [CGSize, 'bool', CGFloat]
);
const UIGraphicsEndImageContext = new NativeFunction(
  Module.findExportByName('UIKit', 'UIGraphicsEndImageContext'),
  'void',
  []
);
const UIGraphicsGetImageFromCurrentImageContext = new NativeFunction(
  Module.findExportByName('UIKit', 'UIGraphicsGetImageFromCurrentImageContext'),
  'pointer',
  []
);
const UIImagePNGRepresentation = new NativeFunction(
  Module.findExportByName('UIKit', 'UIImagePNGRepresentation'),
  'pointer',
  ['pointer']
);

rpc.exports.screenshot = function screenshot () {
  return new Promise(function (resolve) {
    ObjC.schedule(ObjC.mainQueue, function () {
      const view = UIWindow.keyWindow();
      const bounds = view.bounds();
      const [top, size] = bounds;
      const [width, height] = size;

      UIGraphicsBeginImageContextWithOptions(size, 0, 0);

      view.drawViewHierarchyInRect_afterScreenUpdates_(bounds, true);

      const image = UIGraphicsGetImageFromCurrentImageContext();
      UIGraphicsEndImageContext();

      const png = new ObjC.Object(UIImagePNGRepresentation(image));
      const bytes = new Uint8Array(Memory.readByteArray(png.bytes(), png.length()));

      return resolve({
        format: 'png',
        width,
        height,
        scale: view.contentScaleFactor(),
        png: base64.fromByteArray(bytes)
      });
    });
  });
};

