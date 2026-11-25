import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SelectModule } from 'primeng/select';
import { fitTypedValue, formatValue, fromSerializedValue, IOFormat, maxSignalValue, type PropertyField, type PropertyListItem, type SerializedPropertyValue } from '../../../models/Property';

const SIGNAL_FORMAT_FIELDS: Partial<Record<PropertyField, PropertyField>> = {
    'Output Value': 'Output Format',
    'Input Format': 'Input Format',
};
/** An edit made in the panel, with the value in the form the store holds (a bigint as its decimal string). */
export interface PropertyChange {
    field: PropertyField;
    value: SerializedPropertyValue;
}

/**
 * Lists the properties of the previewed or selected component, each with an editor that fits its kind: a checkbox
 * for a boolean, a text field for a string, a number field with buttons for a number or a bigint, and a dropdown for
 * one of a list of options. Readonly properties are shown disabled.
 *
 * It keeps no values of its own: an edit goes out as propertyChange, and the new value comes back in through
 * properties. A text field reports its value when it loses focus or Enter is pressed, rather than on every keystroke.
 */
@Component({
    selector: 'app-selectable-properties-presenter',
    imports: [
        FormsModule,
        CheckboxModule,
        DividerModule,
        InputNumberModule,
        InputTextModule,
        ScrollPanelModule,
        SelectModule
    ],
    templateUrl: './selectable-properties.presenter.component.html',
    styleUrl: './selectable-properties.presenter.component.scss'
})
export class SelectablePropertiesPresenterComponent {
    /** The kind of component the properties belong to, or null when nothing is previewed or selected. */
    @Input() type: string | null = null;
    /** The properties to list, in the order to list them in. */
    @Input() properties: PropertyListItem[] = [];

    @Output() propertyChange = new EventEmitter<PropertyChange>();

    /** The id of a property's editor, for its label: the field in lower case with dashes, e.g. property-number-of-inputs. */
    protected inputId(field: PropertyField): string {
        return `property-${field.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    }

    protected min(property: PropertyListItem): number | undefined {
        return property.definition.kind === 'integer' ? property.definition.min : undefined;
    }

    protected max(property: PropertyListItem): number | undefined {
        return property.definition.kind === 'integer' ? property.definition.max : undefined;
    }

    private signalFormat(property: PropertyListItem): IOFormat {
        const formatField = SIGNAL_FORMAT_FIELDS[property.field];
        const format = this.properties.find(p => p.field === formatField)?.value;
        return Object.values(IOFormat).includes(format as IOFormat) ? format as IOFormat : IOFormat.decimal;
    }

    private signalMax(): bigint | null {
        const busWidth = this.properties.find(p => p.field === 'Bus Width')?.value;
        return typeof busWidth === 'number' ? maxSignalValue(busWidth) : null;
    }

    protected signalText(property: PropertyListItem): string {
        const value = fromSerializedValue(property.field, property.value);
        return typeof value === 'bigint' ? formatValue(value, this.signalFormat(property)) : String(property.value);
    }

    protected onSignalInput(property: PropertyListItem, input: HTMLInputElement) {
        const fit = fitTypedValue(input.value, this.signalFormat(property), this.signalMax());
        if (!fit) return;
        if (fit.text !== input.value) {
            const caret = Math.min(input.selectionStart ?? fit.text.length, fit.text.length);
            input.value = fit.text;
            input.setSelectionRange(caret, caret);
        }
    }

    protected onSignalBlur(property: PropertyListItem, input: HTMLInputElement) {
        input.value = this.signalText(property);
    }

    protected options(property: PropertyListItem): string[] {
        return property.definition.kind === 'enum' ? property.definition.options : [];
    }

    /** A number field holds a bigint as a number, so the buttons can step it. */
    protected numberValue(property: PropertyListItem): number | null {
        const value = Number(property.value);
        return Number.isFinite(value) ? value : null;
    }

    /** A number field, for a number or a bigint, changed. A cleared field changes nothing. */
    protected onNumberChange(property: PropertyListItem, value: number | null) {
        if (value === null || !Number.isFinite(value)) return;
        this.emit(property, value);
    }

    /** A text field lost focus or Enter was pressed in it. */
    protected onTextCommit(property: PropertyListItem, value: string) {
        this.emit(property, value);
    }

    protected onValueChange(property: PropertyListItem, value: SerializedPropertyValue) {
        this.emit(property, value);
    }

    /** Only actual changes to editable properties go out. */
    private emit(property: PropertyListItem, value: SerializedPropertyValue) {
        if (property.readonly || value === property.value) return;
        this.propertyChange.emit({ field: property.field, value });
    }
}
