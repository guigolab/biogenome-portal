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
