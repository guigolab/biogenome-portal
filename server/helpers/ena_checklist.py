# Function to convert XML elements to dictionary
def xml_to_dict(element):
    result = {}
    
    # Get element attributes
    if element.attrib:
        result["attributes"] = element.attrib
    
    # Process child elements
    for child in element:
        child_data = xml_to_dict(child)
        tag = child.tag.lower()
        # Handle multiple occurrences of the same tag
        if tag in result:
            if isinstance(result[tag], list):
                result[tag].append(child_data)
            else:
                result[tag] = [result[tag], child_data]
        else:
            result[tag] = child_data
    
    # Store text content if available
    text = element.text.strip() if element.text and element.text.strip() else None
    if text:
        result["text"] = text
    
    return result