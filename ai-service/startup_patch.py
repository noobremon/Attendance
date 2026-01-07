"""Startup patch to fix TensorFlow/Keras compatibility issues"""

import sys
import importlib

# Apply patch before any problematic imports
print("Applying TensorFlow/Keras compatibility patch...")

try:
    import tensorflow as tf
    
    # Check if LocallyConnected2D is available
    if not hasattr(tf.keras.layers, 'LocallyConnected2D'):
        # Try to find it in various places
        found_layer = None
        
        # Try tf_keras
        try:
            from tf_keras.layers import LocallyConnected2D
            found_layer = LocallyConnected2D
            print("Found LocallyConnected2D in tf_keras.layers")
        except ImportError:
            pass
        
        # Try keras
        if found_layer is None:
            try:
                import keras
                if hasattr(keras.layers, 'LocallyConnected2D'):
                    found_layer = keras.layers.LocallyConnected2D
                    print("Found LocallyConnected2D in keras.layers")
            except ImportError:
                pass
        
        # Try keras.src
        if found_layer is None:
            try:
                from keras.src.layers import LocallyConnected2D
                found_layer = LocallyConnected2D
                print("Found LocallyConnected2D in keras.src.layers")
            except ImportError:
                pass
        
        # Try keras.layers directly
        if found_layer is None:
            try:
                from keras.layers import LocallyConnected2D
                found_layer = LocallyConnected2D
                print("Found LocallyConnected2D in keras.layers (direct import)")
            except ImportError:
                pass
        
        # If found, add it to tensorflow.keras.layers
        if found_layer is not None:
            tf.keras.layers.LocallyConnected2D = found_layer
            print("Successfully patched LocallyConnected2D in tensorflow.keras.layers")
        else:
            # Create a minimal stub to allow import to succeed
            class LocallyConnected2D:
                def __init__(self, *args, **kwargs):
                    raise NotImplementedError(
                        "LocallyConnected2D is not available in your setup. "
                        "This may affect some face recognition models."
                    )
            tf.keras.layers.LocallyConnected2D = LocallyConnected2D
            print("Created stub for LocallyConnected2D to allow imports")
    else:
        print("LocallyConnected2D already exists in tensorflow.keras.layers")
    
    # Set environment variable to ensure compatibility
    import os
    os.environ['TF_KERAS'] = '1'
    print("Set TF_KERAS=1 environment variable")
    
except Exception as e:
    print(f"Error in startup patch: {e}")
    import traceback
    traceback.print_exc()

print("TensorFlow/Keras compatibility patch applied.")