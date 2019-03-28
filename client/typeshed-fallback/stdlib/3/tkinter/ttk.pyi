import sys
from typing import Any, Optional
import tkinter

def tclobjs_to_py(adict): ...
def setup_master(master: Optional[Any] = ...): ...

class Style:
    master = ...  # type: Any
    tk = ...  # type: Any
    def __init__(self, master: Optional[Any] = ...): ...
    def configure(self, style, query_opt: Optional[Any] = ..., **kw): ...
    def map(self, style, query_opt: Optional[Any] = ..., **kw): ...
    def lookup(self, style, option, state: Optional[Any] = ..., default: Optional[Any] = ...): ...
    def layout(self, style, layoutspec: Optional[Any] = ...): ...
    def element_create(self, elementname, etype, *args, **kw): ...
    def element_names(self): ...
    def element_options(self, elementname): ...
    def theme_create(self, themename, parent: Optional[Any] = ..., settings: Optional[Any] = ...): ...
    def theme_settings(self, themename, settings): ...
    def theme_names(self): ...
    def theme_use(self, themename: Optional[Any] = ...): ...

class Widget(tkinter.Widget):
    def __init__(self, master, widgetname, kw: Optional[Any] = ...): ...
    def identify(self, x, y): ...
    def instate(self, statespec, callback: Optional[Any] = ..., *args, **kw): ...
    def state(self, statespec: Optional[Any] = ...): ...

class Button(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def invoke(self): ...

class Checkbutton(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def invoke(self): ...

class Entry(Widget, tkinter.Entry):
    def __init__(self, master: Optional[Any] = ..., widget: Optional[Any] = ..., **kw): ...
    def bbox(self, index): ...
    def identify(self, x, y): ...
    def validate(self): ...

class Combobox(Entry):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def current(self, newindex: Optional[Any] = ...): ...
    def set(self, value): ...

class Frame(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

class Label(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

class Labelframe(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

LabelFrame = ...  # type: Any

class Menubutton(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

class Notebook(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def add(self, child, **kw): ...
    def forget(self, tab_id): ...
    def hide(self, tab_id): ...
    def identify(self, x, y): ...
    def index(self, tab_id): ...
    def insert(self, pos, child, **kw): ...
    def select(self, tab_id: Optional[Any] = ...): ...
    def tab(self, tab_id, option: Optional[Any] = ..., **kw): ...
    def tabs(self): ...
    def enable_traversal(self): ...

class Panedwindow(Widget, tkinter.PanedWindow):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    forget = ...  # type: Any
    def insert(self, pos, child, **kw): ...
    def pane(self, pane, option: Optional[Any] = ..., **kw): ...
    def sashpos(self, index, newpos: Optional[Any] = ...): ...

PanedWindow = ...  # type: Any

class Progressbar(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def start(self, interval: Optional[Any] = ...): ...
    def step(self, amount: Optional[Any] = ...): ...
    def stop(self): ...

class Radiobutton(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def invoke(self): ...

class Scale(Widget, tkinter.Scale):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def configure(self, cnf: Optional[Any] = ..., **kw): ...
    def get(self, x: Optional[Any] = ..., y: Optional[Any] = ...): ...

class Scrollbar(Widget, tkinter.Scrollbar):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

class Separator(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

class Sizegrip(Widget):
    def __init__(self, master: Optional[Any] = ..., **kw): ...

if sys.version_info >= (3, 7):
    class Spinbox(Entry):
        def __init__(self, master: Any = ..., **kw: Any) -> None: ...
        def set(self, value: Any) -> None: ...

class Treeview(Widget, tkinter.XView, tkinter.YView):
    def __init__(self, master: Optional[Any] = ..., **kw): ...
    def bbox(self, item, column: Optional[Any] = ...): ...
    def get_children(self, item: Optional[Any] = ...): ...
    def set_children(self, item, *newchildren): ...
    def column(self, column, option: Optional[Any] = ..., **kw): ...
    def delete(self, *items): ...
    def detach(self, *items): ...
    def exists(self, item): ...
    def focus(self, item: Optional[Any] = ...): ...
    def heading(self, column, option: Optional[Any] = ..., **kw): ...
    def identify(self, component, x, y): ...
    def identify_row(self, y): ...
    def identify_column(self, x): ...
    def identify_region(self, x, y): ...
    def identify_element(self, x, y): ...
    def index(self, item): ...
    def insert(self, parent, index, iid: Optional[Any] = ..., **kw): ...
    def item(self, item, option: Optional[Any] = ..., **kw): ...
    def move(self, item, parent, index): ...
    reattach = ...  # type: Any
    def next(self, item): ...
    def parent(self, item): ...
    def prev(self, item): ...
    def see(self, item): ...
    def selection(self, selop: Optional[Any] = ..., items: Optional[Any] = ...): ...
    def selection_set(self, items): ...
    def selection_add(self, items): ...
    def selection_remove(self, items): ...
    def selection_toggle(self, items): ...
    def set(self, item, column: Optional[Any] = ..., value: Optional[Any] = ...): ...
    def tag_bind(self, tagname, sequence: Optional[Any] = ..., callback: Optional[Any] = ...): ...
    def tag_configure(self, tagname, option: Optional[Any] = ..., **kw): ...
    def tag_has(self, tagname, item: Optional[Any] = ...): ...

class LabeledScale(Frame):
    label = ...  # type: Any
    scale = ...  # type: Any
    def __init__(self, master: Optional[Any] = ..., variable: Optional[Any] = ..., from_: int = ..., to: int = ..., **kw): ...
    def destroy(self): ...
    value = ...  # type: Any

class OptionMenu(Menubutton):
    def __init__(self, master, variable, default: Optional[Any] = ..., *values, **kwargs): ...
    def __getitem__(self, item): ...
    def set_menu(self, default: Optional[Any] = ..., *values): ...
    def destroy(self): ...
