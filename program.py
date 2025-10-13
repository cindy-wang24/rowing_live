import json
import os

def extract_key_landmarks(json_data):
    keypoints = {
        "nose": 0,
        "wrist_l": 15,
        "wrist_r": 16,
        "shoulder_l": 11,
        "shoulder_r": 12,
        "l_elbow": 13,
        "r_elbow": 14,
        "hip_l": 23,
        "hip_r": 24,
        "knee_l": 25,
        "knee_r": 26,
        "ankle_l": 27,
        "ankle_r": 28,
    }

    extracted_variables = {}

    # Ensure json_data is a list and not empty
    if isinstance(json_data, list) and len(json_data) > 0:
        for key, index in keypoints.items():
            # Find the landmark with the matching ID
            landmark = next((lm for lm in json_data if lm["id"] == index), None)
            if landmark:
                extracted_variables[key] = (landmark["x"], landmark["y"])

    # If no landmarks were found, return a message
    if not extracted_variables:
        return "No people detected in the image."

    return extracted_variables

def row():
    json_folder = 'jsons'
    json_files = [f for f in os.listdir(json_folder) if f.endswith('.json')]
    
    file_path = os.path.join(json_folder, json_files[0])  # Open the first JSON file
    with open(file_path, 'r') as file:
        data = json.load(file)  # Load JSON

    key_landmarks = extract_key_landmarks(data)

    if key_landmarks == "No people detected in the image.":
        print("No people detected in the image")
    else:
        # Access shoulder variables
        # Assign all key landmarks to variables
        nose = key_landmarks.get("nose")
        l_wrist = key_landmarks.get("wrist_l")
        r_wrist = key_landmarks.get("wrist_r")
        l_shoulder = key_landmarks.get("shoulder_l")
        r_shoulder = key_landmarks.get("shoulder_r")
        l_hip = key_landmarks.get("hip_l")
        r_hip = key_landmarks.get("hip_r")
        l_knee = key_landmarks.get("knee_l")
        r_knee = key_landmarks.get("knee_r")
        l_ankle = key_landmarks.get("ankle_l")
        r_ankle = key_landmarks.get("ankle_r")
        l_elbow = key_landmarks.get("l_elbow")
        r_elbow = key_landmarks.get("r_elbow")
        #Checks if the person is standing 
        not_stand = abs(r_shoulder[1]-r_hip[1])/abs(r_hip[1]-r_ankle[1])> 1
        #Checks if the person is upside down
        height = (r_elbow[1]< r_hip[1] and r_elbow[1]< r_ankle[1]) or (l_elbow[1]< l_hip[1] and l_elbow[1]< l_ankle[1])
        #Checks if the person is laying down by measuring horizontal distance between knee,nose,hip
        not_lay = abs(nose[1]-r_knee[1]) / abs(r_knee[0]-r_hip[0]) > 0.6
        #Checks if the person is rowing
        is_row = not_stand and height and not_lay
    
        #Checks if person is at catch 
        knee_bent = abs(nose[1]-r_knee[1]) < abs(nose[1]-r_hip[1])
        arms_bent = abs(r_shoulder[1]-r_wrist[1]) < abs(r_shoulder[1]-r_elbow[1])
        #Checks if person is at finish
        # print(not_stand)
        # print(height)
        # print(not_lay)
        if is_row:
            print("The person is rowing")
            if knee_bent:
                print("The person is at the catch")
            elif arms_bent:
                print("The person is at the finish")
            else: 
                print("This person is between catch and finish")
        else:
            print("The person is not rowing")
# Run the row function
row()
