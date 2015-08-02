var $ = require('jquery');
var CodeMirror = require('CodeMirror');
require('CodeMirror/mode/javascript/javascript');

var js2glsl = require('js2glsl');

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
    var jsSource = VertexPosition.toString() + "\r\n" + editor.doc.getValue();
    try {
    var shaderSource = js2glsl(jsSource); 
    
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
function render() {
    gl.shader && (gl.shader.uniforms.t += 0.01); 
    
      //Draw 
    gl.shader && gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    window.requestAnimationFrame(render);
}

render();