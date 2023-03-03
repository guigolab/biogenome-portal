from datetime import datetime
import utils

if __name__ == "__main__":
    print(f"Running import_assemblies at {datetime.now()}")
    utils.trigger_cronjob('import_assemblies')