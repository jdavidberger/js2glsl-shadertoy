var $ = require('jquery');
var CodeMirror = require('CodeMirror');
var esprima = require('esprima'); 
var js2glsl = require('js2glsl');
var nodeUtils = require('js2glsl/libs/nodeUtils'),
    CoffeeScript = require('coffee-script')
    
require('CodeMirror/mode/javascript/javascript');
require('CodeMirror/mode/clike/clike');

var canvas = $("canvas")[0];

var editor = CodeMirror.fromTextArea($("#jssrc")[0], {
    lineNumbers: true,
    mode: "text/javascript"
});


var viewer = CodeMirror.fromTextArea($("#glslsrc")[0], {
    lineNumbers: true,
    mode: "x-shader/x-fragment",
    readOnly:true
});

$(viewer.getWrapperElement()).toggle();

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

var lastSaveId = window.location.hash.replace("#","");

if(lastSaveId) {
    $.ajax( "https://api.github.com/gists/" + lastSaveId, {
        method: "GET"
    }).done(function(data) {
        lastSaveId = data.id;
        lastSourceSave = (data.files["source"] && data.files["source"].content) || "";     
        editor.setValue(lastSourceSave);
        setupShader(); 
    });
}

var lastSourceSave = "";
function saveSource() {
    var src = editor.doc.getValue();
    setupShader();
    if(lastSourceSave != src) {            
            $.ajax( "https://api.github.com/gists", {
                method: "POST",
                dataType: 'json',
                data: JSON.stringify({                  
                  "public": true,
                  "files": {
                    "source": {
                      "content": src
                    },
                    'output': {
                      'content': viewer.doc.getValue()
                    }
                  }
                })                
            }).done(function(data) {
                window.location.hash = '#' + data.id;
                lastSaveId = data.id;
                lastSourceSave = src; 
            });        
    }
}

function setupShader() {    
    try {
    
    var langSource = editor.doc.getValue();
    var langIdLine = langSource.split('\n')[0]; 
    
    var langRegex = /-\*-(.*)-\*-/; 
    var langMatch = langRegex.exec(langIdLine); 
    var jsSource; 
    
    if(langMatch && langMatch[1] && langMatch[1].toLowerCase) {
        switch(langMatch[1].trim().toLowerCase()){
            case '':
            case 'js':
            case 'javascript':
                jsSource = langSource;
                break;
            case 'cs':
            case 'coffeescript':
                jsSource = CoffeeScript.compile(langSource);
                break;
            default:
                throw new Error("Could not identify language " + langMatch[1].trim().toLowerCase()); 
        }
    } else {
        jsSource = langSource;
    }
    viewer.setValue( 'Error creating glsl from: \r\n\r\n' + jsSource);
    
    var ast = esprima.parse(jsSource);
    
    if(nodeUtils.getFunctionByName(ast, "VertexPosition") === undefined) {
        ast.body.push( esprima.parse(VertexPosition.toString()).body[0] ); 
    }
        
    var shaderSource = js2glsl(ast); 
      viewer.setValue( ["/*** Vertex shader ***/",
                        shaderSource.vertex,
                        "/*** Fragment shader ***/",
                        shaderSource.fragment,
                        "/*** Lang source ***/", 
                        jsSource ].join("\n") );
    
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
        $("#errors").text( e.toString());
        $("#errors").show();
        $("canvas").hide();
    }
}

$("#save").on('click', saveSource); 
$("#go").on('click', setupShader); 

function switchViews() {
        $(".CodeMirror").toggle();
        viewer.refresh();
        editor.refresh();
}
$("#toggle").on('click', switchViews); 
$("#report").on('click', function() {
    saveSource();
    window.open('https://github.com/jdavidberger/js2glsl/issues', '_blank');
});
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