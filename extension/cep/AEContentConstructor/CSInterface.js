/**
 * CSInterface.js
 * Adobe CEP Extension Interface
 * 
 * Note: This is a placeholder. In production, use the official CSInterface.js
 * from Adobe CEP Resources: https://github.com/Adobe-CEP/CEP-Resources
 * 
 * For development, download CSInterface.js from:
 * https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_9.x/CSInterface.js
 */

function CSInterface() {
  this.getExtensionID = function() {
    return "com.instories.megascript";
  };
  
  this.evalScript = function(script, callback) {
    if (typeof window.__adobe_cep__.evalScript === "function") {
      window.__adobe_cep__.evalScript(script, callback);
    } else {
      // Fallback for development
      if (callback) callback("{}");
    }
  };
  
  this.getSystemPath = function(pathType) {
    return "";
  };
  
  this.getHostEnvironment = function() {
    return JSON.stringify({
      appName: "AEFT",
      appVersion: "0.0.0"
    });
  };
}
