/**
 * ANGULAR 2 LOCALIZATION
 * An Angular 2 library to translate messages, dates and numbers.
 * Written by Roberto Simonetti.
 * MIT license.
 * https://github.com/robisim74/angular2localization
 */

import { DecimalPipe } from '@angular/common';

// Services.
import { IntlSupport } from './Intl-support';

function isPresent(obj: any): boolean {

    return obj !== undefined && obj !== null;

}

/**
 * LocaleParser class.
 * Parses a string and returns a number by default locale.
 * 
 * @author Roberto Simonetti
 */
export class LocaleParser {

    /**
     * Builds the regular expression for a number by default locale.
     * 
     * @param defaultLocale The default locale
     * @param digits The digit info: {minIntegerDigits}.{minFractionDigits}-{maxFractionDigits}
     * @return A RegExp object
     */
    public static NumberRegExpFactory(defaultLocale: string, digits: string): RegExp {

        // Gets digits.
        let minInt: number = 1;
        let minFraction: number = 0;
        let maxFraction: number = 3;

        const NUMBER_FORMAT_REGEXP: RegExp = /^(\d+)?\.((\d+)(\-(\d+))?)?$/;

        if (isPresent(digits)) {

            var parts: RegExpMatchArray = digits.match(NUMBER_FORMAT_REGEXP);

            if (parts === null) {
                throw new Error(`${digits} is not a valid digit info for number`);
            }
            if (isPresent(parts[1])) {  // Min integer digits.
                minInt = NumberWrapper.parseIntAutoRadix(parts[1]);
            }
            if (isPresent(parts[3])) {  // Min fraction digits.
                minFraction = NumberWrapper.parseIntAutoRadix(parts[3]);
            }
            if (isPresent(parts[5])) {  // Max fraction digits.
                maxFraction = NumberWrapper.parseIntAutoRadix(parts[5]);
            }
        }

        // Converts numbers & signs to Unicode by default locale.
        var codes: DecimalCode = new DecimalCode(defaultLocale);

        var minusSign: string = codes.minusSign;
        var zero: string = codes.numbers[0];
        var decimalSeparator: string = codes.decimalSeparator;
        var nine: string = codes.numbers[9];

        // Pattern for 1.2-2 digits: /^-?[0-9]{1,}\.[0-9]{2,2}$/
        // Unicode pattern = "^\u002d?[\u0030-\u0039]{1,}\\u002e[\u0030-\u0039]{2,2}$";
        var pattern: string;
        if (minFraction > 0 && maxFraction > 0) {

            pattern = "^"
                + minusSign
                + "?[" + zero + "-" + nine
                + "]{" + minInt + ",}\\"
                + decimalSeparator
                + "[" + zero + "-" + nine
                + "]{" + minFraction + "," + maxFraction
                + "}$";

        } else if (minFraction == 0 && maxFraction > 0) {

            // Decimal separator is optional.
            pattern = "^"
                + minusSign
                + "?[" + zero + "-" + nine
                + "]{" + minInt + ",}\\"
                + decimalSeparator
                + "?[" + zero + "-" + nine
                + "]{" + minFraction + "," + maxFraction
                + "}$";

        } else {

            // Integer number.
            pattern = "^"
                + minusSign
                + "?[" + zero + "-" + nine
                + "]{" + minInt + ",}$";

        }
        pattern = codes.UnicodeToChar(pattern);
        var regExp: RegExp = new RegExp(pattern);

        return regExp;

        // Wonderful, it works!
    }

    /**
     * Parses a string and returns a number by default locale.
     * 
     * @param s The string to be parsed
     * @param defaultLocale The default locale
     * @return A number. If the string cannot be converted to a number, returns NaN
     */
    public static Number(s: string, defaultLocale: string): number {

        if (s == "" || defaultLocale == "" || defaultLocale == null) { return null; }

        var codes: DecimalCode = new DecimalCode(defaultLocale);

        return codes.parse(s);

    }

}

/**
 * NumberCode abstract superclass.
 * 
 * Converts numbers to Unicode by locales.
 * 
 * @author Roberto Simonetti
 */
abstract class NumberCode {

    /**
     * Unicode for numbers from 0 to 9.
     */
    public numbers: Array<string> = [];

    constructor(public defaultLocale: string) {

        for (var i: number = 0; i <= 9; i++) {

            this.numbers.push(this.Unicode(i.toString()));

        }

        // Checks for support for Intl.
        if (IntlSupport.NumberFormat(defaultLocale) == true) {

            // Updates Unicode for numbers by default locale.
            for (var i: number = 0; i <= 9; i++) {

                var localeDecimal: DecimalPipe = new DecimalPipe(defaultLocale);

                this.numbers[i] = this.Unicode(localeDecimal.transform(i, '1.0-0'));

            }

        }

    }

    /**
     * Parses a string and returns a number by default locale.
     * 
     * @param s The string to be parsed
     * @return A number
     */
    public abstract parse(s: string): number;

    public abstract UnicodeToChar(pattern: string): string;

    protected Unicode(c: string): string {

        return "\\u" + this.HexEncode(c.charCodeAt(0));

    }

    protected HexEncode(value: number): string {

        var hex: string = value.toString(16).toUpperCase();
        // With padding.
        hex = "0000".substr(0, 4 - hex.length) + hex;

        return hex;

    }

}

/**
 * DecimalCode class.
 * 
 * Converts numbers & signs to Unicode by locales.
 * 
 * @author Roberto Simonetti
 */
class DecimalCode extends NumberCode {

    /**
     * Unicode for minus sign.
     */
    public minusSign: string;

    /**
     * Unicode for decimal separator.
     */
    public decimalSeparator: string;

    constructor(public defaultLocale: string) {
        super(defaultLocale);

        this.minusSign = this.Unicode("-");
        this.decimalSeparator = this.Unicode(".");

        // Checks for support for Intl.
        if (IntlSupport.NumberFormat(defaultLocale) == true) {

            // Updates Unicode for signs by default locale.
            var value: number = -0.9; // Reference value.
            var localeDecimal: DecimalPipe = new DecimalPipe(defaultLocale);

            var localeValue: string = localeDecimal.transform(value, '1.1-1');

            // Checks Unicode character 'RIGHT-TO-LEFT MARK' (U+200F).
            var index: number;
            if (this.Unicode(localeValue.charAt(0)) != "\\u200F") {
                // Left to right.
                index = 0;
            } else {
                // Right to left.
                index = 1;
            }

            this.minusSign = this.Unicode(localeValue.charAt(index));
            this.decimalSeparator = this.Unicode(localeValue.charAt(index + 2));

        }

    }

    public parse(s: string): number {

        // Splits the String object into an array of characters.
        var characters: Array<string> = s.split("");

        // Builds the value.
        var value: string = "";

        for (let char of characters) {

            var charCode: string = this.Unicode(char);

            // Tries to look for the char code in numbers and signs.
            var index: number = this.numbers.indexOf(charCode);
            if (index != -1) {

                value += index;

            } else if (charCode == this.minusSign) {

                value += "-";

            } else if (charCode == this.decimalSeparator) {

                value += ".";

            } else { return NaN; }

        }

        return parseFloat(value);

    }

    public UnicodeToChar(pattern: string): string {

        return pattern.replace(/\\u[\dA-F]{4}/gi, (match: string) => {

            return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));

        });

    }

}

class NumberWrapper {

    static parseIntAutoRadix(text: string): number {

        var result: number = parseInt(text, null);

        if (isNaN(result)) {
            throw new Error('Invalid integer literal when parsing ' + text);
        }

        return result;

    }

    static parseInt(text: string, radix: number): number {

        if (radix == 10) {

            if (/^(\-|\+)?[0-9]+$/.test(text)) {
                return parseInt(text, radix);
            }

        } else if (radix == 16) {

            if (/^(\-|\+)?[0-9ABCDEFabcdef]+$/.test(text)) {
                return parseInt(text, radix);
            }

        } else {

            var result: number = parseInt(text, radix);

            if (!isNaN(result)) {
                return result;
            }

        }
        throw new Error('Invalid integer literal when parsing ' + text + ' in base ' + radix);

    }

}
