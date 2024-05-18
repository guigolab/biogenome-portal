import requests
import json


DATA_SET_KEY="e0737b6f-8e8b-4ea5-aad4-b905a79a86ae"

def fetch_all_data(url, output_file):
    try:
        all_data = []

        # Set initial page number
        offset = 0

        while True:
            # Send a GET request to the URL with pagination parameters
            response = requests.get(url, params={"advanced":False,"dataset_key":DATA_SET_KEY, "offset": offset, "limit": 300})

            # Check if the request was successful (status code 200)
            if response.status_code == 200:
                # Parse JSON response
                data = response.json()
                results = data.get("results")
                # Append current page data to all_data
                all_data.extend(results)

                print(len(results))

                # Check if there are more pages
                if len(results) == 0:
                    break  # No more pages, stop fetching
                else:
                    offset += 1  # Move to the next page

            else:
                print("Failed to fetch data. Status code:", response.status_code)
                return

        # Write all_data to a file
        with open(output_file, 'w') as file:
            json.dump(all_data, file, indent=4)

        print("All data saved successfully to:", output_file)
    except requests.RequestException as e:
        print("Error fetching data:", e)

url = "https://www.gbif.org/api/occurrence/search"

# File path where you want to save the JSON data
output_file = "CSIC_CMCNB_BC_Tremols.json"

# Call the function to fetch and save data
fetch_all_data(url, output_file)
