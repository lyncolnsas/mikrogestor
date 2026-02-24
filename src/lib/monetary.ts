import { Decimal } from '@prisma/client/runtime/library';

export class Monetary {
    private value: Decimal;

    constructor(value: number | string | Decimal) {
        this.value = new Decimal(value);
    }

    static from(value: number | string | Decimal): Monetary {
        return new Monetary(value);
    }

    add(other: Monetary | number): Monetary {
        const otherVal = other instanceof Monetary ? other.value : new Decimal(other);
        return new Monetary(this.value.add(otherVal));
    }

    sub(other: Monetary | number): Monetary {
        const otherVal = other instanceof Monetary ? other.value : new Decimal(other);
        return new Monetary(this.value.sub(otherVal));
    }

    mul(other: Monetary | number): Monetary {
        const otherVal = other instanceof Monetary ? other.value : new Decimal(other);
        return new Monetary(this.value.mul(otherVal));
    }

    div(other: Monetary | number): Monetary {
        const otherVal = other instanceof Monetary ? other.value : new Decimal(other);
        return new Monetary(this.value.div(otherVal));
    }

    toDecimal(): Decimal {
        return this.value;
    }

    toNumber(): number {
        return this.value.toNumber();
    }

    toFixed(precision: number = 2): string {
        return this.value.toFixed(precision);
    }
}
