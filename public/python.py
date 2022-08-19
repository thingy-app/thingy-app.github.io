# Python script of functions, to be called in js code (run in browser with pyscript/web-assembly).

# Note: modules imported here must also be listed in <py-env> tag
import numpy as np
import pandas
from scipy import constants

# test function
def test(data):
    x = 8 + data.x[1]
    return x
document.test = test # add function reference to document object, for use in js later

# optional js console indicator
console.log('------------ PYTHON LOADED; triggering callback ------------')

# trigger callback to indicate python functions are ready to be called, and pass functions as argument
document.onPythonLoaded()