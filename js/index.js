var $ = require('jquery');
var CodeMirror = require('CodeMirror');
require('CodeMirror/mode/javascript/javascript');
var esprima = require('esprima'); 
var js2glsl = require('js2glsl');
var nodeUtils = require('js2glsl/libs/nodeUtils');

var canvas = $("canvas")[0];

var editor = CodeMirror.fromTextArea($("textarea")[0], {
    lineNumbers: true,
    mode: "text/javascript"
});

var gl = canvas.getContext("webgl"); 
var createShader = require('gl-shader');

var buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
]), gl.STATIC_DRAW)



function VertexPosition() {
    varyings.pt = attributes.pt; 
    return [ attributes.pt[0], attributes.pt[1] ]; 
};

function setupShader() {
    
    var jsSource = editor.doc.getValue();
    var ast = esprima.parse(jsSource);
    
    if(nodeUtils.getFunctionByName(ast, "VertexPosition") === undefined) {
        ast.body.push( esprima.parse(VertexPosition.toString()).body[0] ); 
    }
    
    try {
    var shaderSource = js2glsl(ast); 
    
        var shader = createShader(gl,
            shaderSource.vertex,
            shaderSource.fragment);
            
      shader.bind()
      gl.shader = shader; 
      //Set attributes 
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      shader.attributes.pt.pointer();      
      $("#errors").hide();
      $("canvas").show();
    } catch(e) {
        var whereAt = "<uncompilable>";
        if(shaderSource && shaderSource.vertex)
            whereAt = shaderSource.vertex + "\r\n----\r\n" + shaderSource.fragment;
        $("#errors").text( e.toString() + " in: \r\n" + whereAt);
        $("#errors").show();
        $("canvas").hide();
    }
}

$("#go").on('click', setupShader); 
setupShader();
var start = Date.now();
function render() {
    if(gl.shader)  {
        gl.shader.uniforms.t = (Date.now() - start) / 1000.0;        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
      //Draw 
    window.requestAnimationFrame(render);
}

render();