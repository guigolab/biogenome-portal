/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(1));
__export(__webpack_require__(2));
__export(__webpack_require__(3));
exports.t = m => m[0].map((x, i) => m.map(x => x[i]));
/*
    export abstract class UiNode
    {
        args: {
            UiNode stuff +
                parent: UiNode
                model: {},

            transformation: {},
            plexxCss : {}
        }

        constructor()
        {
        }

        updateModel() {}
        updateViewModel(sel:[string]) {}

        updateAll() {}
    }
*/


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class HTML {
    static parse(htmlstr) {
        return function () {
            if (navigator.userAgent.includes('Edge')
                || navigator.userAgent.includes('MSIE')) {
                var div = document.createElement('div');
                div.innerHTML = htmlstr;
                return div.firstChild;
            }
            else {
                var template = document.createElement('template');
                template.innerHTML = htmlstr;
                return template.content.firstElementChild;
            }
        };
    }
}
exports.HTML = HTML;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function tosub(s) {
    var result = '';
    var str = s.toString().trim();
    for (var i = 0; i < str.length; i++)
        result += String.fromCharCode(8320 + Number(str.charAt(i)));
    return result;
}
exports.tosub = tosub;
exports.isPrimitive = item => typeof item !== 'object'; // function, string, number, boolean, undefined, symbol
exports.isObject = item => typeof item === 'object' && !Array.isArray(item);
exports.isArray = item => typeof item === 'object' && Array.isArray(item);
exports.mergeDeep = (target, source) => {
    console.assert((exports.isObject(target) && exports.isObject(source)) ||
        (exports.isArray(target) && exports.isArray(source)));
    for (const key in source) {
        if (exports.isObject(source[key])) {
            console.debug('merging Object: ', key);
            target[key] = exports.mergeDeep(target[key] || Object.create(Object.getPrototypeOf(source[key])), source[key]);
        }
        else if (exports.isArray(source[key])) {
            console.debug('merging Array: ', key);
            target[key] = exports.mergeDeep(target[key] || [], source[key]);
        }
        else if (exports.isPrimitive(source[key])) {
            console.debug('merging Primitive: ', key);
            target[key] = source[key];
        }
        else
            console.assert(false);
    }
    return target;
};
function clone(o) {
    //return mergeDeep({}, o)
    return JSON.parse(JSON.stringify(o));
}
exports.clone = clone;
function shuffleArray(array, n) {
    if (array)
        for (let i = array.length - 1; i > 0; i--) {
            let r = (i * i + n.height) % array.length;
            //let r = Math.random()
            let j = Math.floor(r);
            [array[i], array[j]] = [array[j], array[i]];
        }
}
exports.shuffleArray = shuffleArray;
function stringhash(s) {
    let hash = 0, i, chr;
    if (!s || s.length === 0)
        return hash;
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
exports.stringhash = stringhash;
const googlePalette_ = [
    "#3366cc", "#dc3912", "#ff9900", "#109618",
    "#990099", "#0099c6", "#dd4477", "#66aa00",
    "#b82e2e", "#316395", "#994499", "#22aa99",
    "#aaaa11", "#6633cc", "#e67300", "#8b0707",
    "#651067", "#329262", "#5574a6", "#3b3eac"
];
function googlePalette(idx) {
    return googlePalette_[idx % googlePalette_.length];
}
exports.googlePalette = googlePalette;


/***/ })
/******/ ]);
//# sourceMappingURL=ducd.js.map