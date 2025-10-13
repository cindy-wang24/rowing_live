import os
import cv2
import json
import mediapipe as mp

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

# Drawing utilities
mp_drawing = mp.solutions.drawing_utils

# Get the current script directory
base_dir = os.path.dirname(os.path.abspath(__file__))

# Define input and output folders
input_folder = os.path.join(base_dir, "upload")  # Folder with images
json_folder = os.path.join(base_dir, "jsons")  # Folder for JSON landmark data
pics_folder = os.path.join(base_dir, "pics")  # Folder for images with landmarks

# Ensure the folders exist
os.makedirs(input_folder, exist_ok=True)
os.makedirs(json_folder, exist_ok=True)
os.makedirs(pics_folder, exist_ok=True)

# Process all images in the input folder
for file_name in os.listdir(input_folder):
    if not file_name.lower().endswith((".jpg", ".png", ".jpeg")):  # Filter image files
        continue

    # Load the image
    image_path = os.path.join(input_folder, file_name)
    image = cv2.imread(image_path)

    # Convert the BGR image to RGB for MediaPipe
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Perform pose detection
    results = pose.process(rgb_image)

    # Check if any landmarks are detected
    if results.pose_landmarks:
        # Save landmark coordinates as a dictionary
        landmarks = []
        for id, landmark in enumerate(results.pose_landmarks.landmark):
            landmarks.append({
                "id": id,
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility
            })

        # Save the landmarks to a JSON file
        json_file_path = os.path.join(json_folder, f"{os.path.splitext(file_name)[0]}.json")
        with open(json_file_path, "w") as json_file:
            json.dump(landmarks, json_file, indent=4)
        # Draw landmarks on the image
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        # Save the image with landmarks in the 'pics' folder
        output_image_path = os.path.join(pics_folder, f"{os.path.splitext(file_name)[0]}.jpg")
        cv2.imwrite(output_image_path, image)

    else:
        print(f"No pose landmarks detected in {file_name}")
    os.remove(image_path)
# Cleanup
pose.close()
print("Processing complete.")
