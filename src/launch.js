import urlUtils from "./util/url";
let storedJSON = JSON.parse(localStorage.getItem("dtrAppTempClientSet"));


// For demonstration purposes, if you registered a confidential client
// you can enter its secret here. The demo app will pretend it's a confidential
// app (in reality it cannot be confidential, since it cannot keep secrets in the
// browser)
var secret = null; // set me, if confidential

// These parameters will be received at launch time in the URL
var serviceUri = urlUtils.getUrlParameter("iss");
var launchContextId = urlUtils.getUrlParameter("launch");

// Change this to the ID of the client that you registered with the SMART on FHIR authorization server.
var clientId = "default"; // local client


console.log(serviceUri);
localStorage.setItem("lastAccessedServiceUri", serviceUri);
if(storedJSON) {
    if(storedJSON[serviceUri]) {
        clientId = storedJSON[serviceUri];
    }else if(storedJSON["default"]){
        clientId = storedJSON["default"];
    }else{
        const errorMsg = "no client id found in local storage, please go to the /register page to register a client id, or verify that the default clientId string in the code is correctly typed.";
        console.log(errorMsg);
        console.log("The app could not find the appropriate client ID");
    }
}else{
    console.log("Unable to access local storage, try visiting /register if you haven't already");
}


// The scopes that the app will request from the authorization server
// encoded in a space-separated string:
//      1. permission to read all of the patient's record
//      2. permission to launch the app in the specific context
var scope = ["launch"].join(" ");

// Generate a unique session key string (here we just generate a random number
// for simplicity, but this is not 100% collision-proof)
var state = Math.round(Math.random() * 100000000).toString();

// To keep things flexible, let's construct the launch URL by taking the base of the
// current URL and replace "launch.html" with "index.html".
var launchUri = window.location.protocol + "//" + window.location.host + window.location.pathname;
var redirectUri = launchUri.replace("launch", "index");

// FHIR Service Conformance Statement URL
var conformanceUri = serviceUri + "/metadata?_format=json";

// Let's request the conformance statement from the SMART on FHIR API server and
// find out the endpoint URLs for the authorization server
let conformanceStatement;
const conformanceGet = new XMLHttpRequest();
conformanceGet.open("GET", conformanceUri);
conformanceGet.setRequestHeader("Content-Type", "application/json");
conformanceGet.setRequestHeader("Accept", "application/json");

conformanceGet.onload = function() {
  if (conformanceGet.status === 200) {
    try {

      conformanceStatement = JSON.parse(conformanceGet.responseText);
    } catch (e) {
      const errorMsg = "Unable to parse conformance statement.";
      document.body.innerText = errorMsg;
      console.error(errorMsg);
      return;
    }
    redirect(conformanceStatement);
  } else {
    const errorMsg = "Conformance statement request failed. Returned status: " + conformanceGet.status;
    document.body.innerText = errorMsg;
    console.error(errorMsg);
    return;
  }
};
conformanceGet.send();

function redirect(conformanceStatement) {
  var authUri, tokenUri;
  var smartExtension = conformanceStatement.rest[0].security.extension.filter(function(e) {
    return e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
  });

  smartExtension[0].extension.forEach(function(arg) {
    if (arg.url === "authorize") {
      authUri = arg.valueUri;
    } else if (arg.url === "token") {
      tokenUri = arg.valueUri;
    }
  });

  // retain a couple parameters in the session for later use
  sessionStorage[state] = JSON.stringify({
    clientId: clientId,
    secret: secret,
    serviceUri: serviceUri,
    redirectUri: redirectUri,
    tokenUri: tokenUri
  });
console.log(clientId);
  // finally, redirect the browser to the authorizatin server and pass the needed
  // parameters for the authorization request in the URL
  window.location.href =
    authUri +
    "?" +
    "response_type=code&" +
    "client_id=" +
    encodeURIComponent(clientId) +
    "&" +
    "scope=" +
    encodeURIComponent(scope) +
    "&" +
    "redirect_uri=" +
    encodeURIComponent(redirectUri) +
    "&" +
    "aud=" +
    encodeURIComponent(serviceUri) +
    "&" +
    "launch=" +
    encodeURIComponent(launchContextId) +
    "&" +
    "state=" +
    state;
}
