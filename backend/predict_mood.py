import sys
import json
import os
import warnings
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# ===============================
# Suppress TensorFlow warnings
# ===============================
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
warnings.filterwarnings("ignore")

# ===============================
# Silent imports
# ===============================
with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
    from tensorflow.keras.models import load_model
    from PIL import Image
    import numpy as np

# ===============================
# UTF-8 Fix for Windows
# ===============================
if sys.platform.startswith("win"):
    try:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    except:
        pass

# ===============================
# Emotion labels
# ===============================
labels_dict = {
    0: "Angry",
    1: "Disgust",
    2: "Fear",
    3: "Happy",
    4: "Neutral",
    5: "Sad",
    6: "Surprise",
}

# ===============================
# Main prediction logic
# ===============================
def main():
    try:
        # Ensure path provided
        if len(sys.argv) < 2:
            raise ValueError("No image path provided")

        image_path = sys.argv[1]

        # Validate file
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")

        # Load model silently
        MODEL_PATH = "model/ResNet50V2_Model.h5"
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            model = load_model(MODEL_PATH)

        # Load & preprocess
        img = Image.open(image_path).convert("RGB")
        img = img.resize((224, 224))
        img_array = np.asarray(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Predict silently
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            prediction = model.predict(img_array, verbose=0)

        # Result
        idx = int(np.argmax(prediction))
        mood = labels_dict[idx]
        confidence = float(np.max(prediction))

        result = {
            "prediction": mood,
            "confidence": confidence
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
