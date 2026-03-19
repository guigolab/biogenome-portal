from werkzeug.exceptions import NotFound


def get_or_404(model, not_found_message, **filters):
    item = model.objects(**filters).first()
    if not item:
        raise NotFound(description=not_found_message)
    return item


def delete_or_404(model, id_field, id_value, not_found_message):
    item = get_or_404(model, not_found_message, **{id_field: id_value})
    item.delete()
    return id_value

