from datetime import datetime
import cronjobs.helpers.utils as utils

if __name__ == "__main__":
    print(f"Running update_reads at {datetime.now()}")
    utils.trigger_cronjob('update_sample_coordinates')