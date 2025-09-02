
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Garage
 * 
 */
export type Garage = $Result.DefaultSelection<Prisma.$GaragePayload>
/**
 * Model Floor
 * 
 */
export type Floor = $Result.DefaultSelection<Prisma.$FloorPayload>
/**
 * Model Spot
 * 
 */
export type Spot = $Result.DefaultSelection<Prisma.$SpotPayload>
/**
 * Model Vehicle
 * 
 */
export type Vehicle = $Result.DefaultSelection<Prisma.$VehiclePayload>
/**
 * Model ParkingSession
 * 
 */
export type ParkingSession = $Result.DefaultSelection<Prisma.$ParkingSessionPayload>
/**
 * Model Ticket
 * 
 */
export type Ticket = $Result.DefaultSelection<Prisma.$TicketPayload>
/**
 * Model Payment
 * 
 */
export type Payment = $Result.DefaultSelection<Prisma.$PaymentPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const SpotType: {
  COMPACT: 'COMPACT',
  STANDARD: 'STANDARD',
  OVERSIZED: 'OVERSIZED',
  HANDICAP: 'HANDICAP',
  ELECTRIC: 'ELECTRIC',
  MOTORCYCLE: 'MOTORCYCLE'
};

export type SpotType = (typeof SpotType)[keyof typeof SpotType]


export const SpotStatus: {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
  MAINTENANCE: 'MAINTENANCE'
};

export type SpotStatus = (typeof SpotStatus)[keyof typeof SpotStatus]


export const VehicleType: {
  COMPACT: 'COMPACT',
  STANDARD: 'STANDARD',
  OVERSIZED: 'OVERSIZED',
  MOTORCYCLE: 'MOTORCYCLE',
  TRUCK: 'TRUCK',
  BUS: 'BUS'
};

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType]


export const VehicleStatus: {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  BANNED: 'BANNED',
  INACTIVE: 'INACTIVE'
};

export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus]


export const SessionStatus: {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  ABANDONED: 'ABANDONED'
};

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]


export const RateType: {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  FLAT_RATE: 'FLAT_RATE'
};

export type RateType = (typeof RateType)[keyof typeof RateType]


export const TicketType: {
  OVERSTAY: 'OVERSTAY',
  NO_PAYMENT: 'NO_PAYMENT',
  EXPIRED_METER: 'EXPIRED_METER',
  INVALID_SPOT: 'INVALID_SPOT',
  HANDICAP_VIOLATION: 'HANDICAP_VIOLATION',
  BLOCKING: 'BLOCKING',
  OTHER: 'OTHER'
};

export type TicketType = (typeof TicketType)[keyof typeof TicketType]


export const TicketStatus: {
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  DISPUTED: 'DISPUTED',
  DISMISSED: 'DISMISSED',
  OVERDUE: 'OVERDUE'
};

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus]


export const PaymentType: {
  PARKING: 'PARKING',
  FINE: 'FINE',
  DEPOSIT: 'DEPOSIT',
  REFUND: 'REFUND'
};

export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType]


export const PaymentMethod: {
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  MOBILE_PAYMENT: 'MOBILE_PAYMENT',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHECK: 'CHECK'
};

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]


export const PaymentStatus: {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED'
};

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

}

export type SpotType = $Enums.SpotType

export const SpotType: typeof $Enums.SpotType

export type SpotStatus = $Enums.SpotStatus

export const SpotStatus: typeof $Enums.SpotStatus

export type VehicleType = $Enums.VehicleType

export const VehicleType: typeof $Enums.VehicleType

export type VehicleStatus = $Enums.VehicleStatus

export const VehicleStatus: typeof $Enums.VehicleStatus

export type SessionStatus = $Enums.SessionStatus

export const SessionStatus: typeof $Enums.SessionStatus

export type RateType = $Enums.RateType

export const RateType: typeof $Enums.RateType

export type TicketType = $Enums.TicketType

export const TicketType: typeof $Enums.TicketType

export type TicketStatus = $Enums.TicketStatus

export const TicketStatus: typeof $Enums.TicketStatus

export type PaymentType = $Enums.PaymentType

export const PaymentType: typeof $Enums.PaymentType

export type PaymentMethod = $Enums.PaymentMethod

export const PaymentMethod: typeof $Enums.PaymentMethod

export type PaymentStatus = $Enums.PaymentStatus

export const PaymentStatus: typeof $Enums.PaymentStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Garages
 * const garages = await prisma.garage.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Garages
   * const garages = await prisma.garage.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.garage`: Exposes CRUD operations for the **Garage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Garages
    * const garages = await prisma.garage.findMany()
    * ```
    */
  get garage(): Prisma.GarageDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.floor`: Exposes CRUD operations for the **Floor** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Floors
    * const floors = await prisma.floor.findMany()
    * ```
    */
  get floor(): Prisma.FloorDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.spot`: Exposes CRUD operations for the **Spot** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Spots
    * const spots = await prisma.spot.findMany()
    * ```
    */
  get spot(): Prisma.SpotDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.vehicle`: Exposes CRUD operations for the **Vehicle** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Vehicles
    * const vehicles = await prisma.vehicle.findMany()
    * ```
    */
  get vehicle(): Prisma.VehicleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.parkingSession`: Exposes CRUD operations for the **ParkingSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ParkingSessions
    * const parkingSessions = await prisma.parkingSession.findMany()
    * ```
    */
  get parkingSession(): Prisma.ParkingSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.ticket`: Exposes CRUD operations for the **Ticket** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tickets
    * const tickets = await prisma.ticket.findMany()
    * ```
    */
  get ticket(): Prisma.TicketDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.payment`: Exposes CRUD operations for the **Payment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Payments
    * const payments = await prisma.payment.findMany()
    * ```
    */
  get payment(): Prisma.PaymentDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.15.0
   * Query Engine version: 85179d7826409ee107a6ba334b5e305ae3fba9fb
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Garage: 'Garage',
    Floor: 'Floor',
    Spot: 'Spot',
    Vehicle: 'Vehicle',
    ParkingSession: 'ParkingSession',
    Ticket: 'Ticket',
    Payment: 'Payment'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "garage" | "floor" | "spot" | "vehicle" | "parkingSession" | "ticket" | "payment"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Garage: {
        payload: Prisma.$GaragePayload<ExtArgs>
        fields: Prisma.GarageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GarageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GarageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>
          }
          findFirst: {
            args: Prisma.GarageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GarageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>
          }
          findMany: {
            args: Prisma.GarageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>[]
          }
          create: {
            args: Prisma.GarageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>
          }
          createMany: {
            args: Prisma.GarageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GarageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>[]
          }
          delete: {
            args: Prisma.GarageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>
          }
          update: {
            args: Prisma.GarageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>
          }
          deleteMany: {
            args: Prisma.GarageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GarageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GarageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>[]
          }
          upsert: {
            args: Prisma.GarageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GaragePayload>
          }
          aggregate: {
            args: Prisma.GarageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGarage>
          }
          groupBy: {
            args: Prisma.GarageGroupByArgs<ExtArgs>
            result: $Utils.Optional<GarageGroupByOutputType>[]
          }
          count: {
            args: Prisma.GarageCountArgs<ExtArgs>
            result: $Utils.Optional<GarageCountAggregateOutputType> | number
          }
        }
      }
      Floor: {
        payload: Prisma.$FloorPayload<ExtArgs>
        fields: Prisma.FloorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FloorFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FloorFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>
          }
          findFirst: {
            args: Prisma.FloorFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FloorFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>
          }
          findMany: {
            args: Prisma.FloorFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>[]
          }
          create: {
            args: Prisma.FloorCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>
          }
          createMany: {
            args: Prisma.FloorCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FloorCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>[]
          }
          delete: {
            args: Prisma.FloorDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>
          }
          update: {
            args: Prisma.FloorUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>
          }
          deleteMany: {
            args: Prisma.FloorDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FloorUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FloorUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>[]
          }
          upsert: {
            args: Prisma.FloorUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FloorPayload>
          }
          aggregate: {
            args: Prisma.FloorAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFloor>
          }
          groupBy: {
            args: Prisma.FloorGroupByArgs<ExtArgs>
            result: $Utils.Optional<FloorGroupByOutputType>[]
          }
          count: {
            args: Prisma.FloorCountArgs<ExtArgs>
            result: $Utils.Optional<FloorCountAggregateOutputType> | number
          }
        }
      }
      Spot: {
        payload: Prisma.$SpotPayload<ExtArgs>
        fields: Prisma.SpotFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SpotFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SpotFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>
          }
          findFirst: {
            args: Prisma.SpotFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SpotFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>
          }
          findMany: {
            args: Prisma.SpotFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>[]
          }
          create: {
            args: Prisma.SpotCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>
          }
          createMany: {
            args: Prisma.SpotCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SpotCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>[]
          }
          delete: {
            args: Prisma.SpotDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>
          }
          update: {
            args: Prisma.SpotUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>
          }
          deleteMany: {
            args: Prisma.SpotDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SpotUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SpotUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>[]
          }
          upsert: {
            args: Prisma.SpotUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SpotPayload>
          }
          aggregate: {
            args: Prisma.SpotAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSpot>
          }
          groupBy: {
            args: Prisma.SpotGroupByArgs<ExtArgs>
            result: $Utils.Optional<SpotGroupByOutputType>[]
          }
          count: {
            args: Prisma.SpotCountArgs<ExtArgs>
            result: $Utils.Optional<SpotCountAggregateOutputType> | number
          }
        }
      }
      Vehicle: {
        payload: Prisma.$VehiclePayload<ExtArgs>
        fields: Prisma.VehicleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VehicleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VehicleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          findFirst: {
            args: Prisma.VehicleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VehicleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          findMany: {
            args: Prisma.VehicleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>[]
          }
          create: {
            args: Prisma.VehicleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          createMany: {
            args: Prisma.VehicleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VehicleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>[]
          }
          delete: {
            args: Prisma.VehicleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          update: {
            args: Prisma.VehicleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          deleteMany: {
            args: Prisma.VehicleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VehicleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.VehicleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>[]
          }
          upsert: {
            args: Prisma.VehicleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          aggregate: {
            args: Prisma.VehicleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVehicle>
          }
          groupBy: {
            args: Prisma.VehicleGroupByArgs<ExtArgs>
            result: $Utils.Optional<VehicleGroupByOutputType>[]
          }
          count: {
            args: Prisma.VehicleCountArgs<ExtArgs>
            result: $Utils.Optional<VehicleCountAggregateOutputType> | number
          }
        }
      }
      ParkingSession: {
        payload: Prisma.$ParkingSessionPayload<ExtArgs>
        fields: Prisma.ParkingSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ParkingSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ParkingSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>
          }
          findFirst: {
            args: Prisma.ParkingSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ParkingSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>
          }
          findMany: {
            args: Prisma.ParkingSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>[]
          }
          create: {
            args: Prisma.ParkingSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>
          }
          createMany: {
            args: Prisma.ParkingSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ParkingSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>[]
          }
          delete: {
            args: Prisma.ParkingSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>
          }
          update: {
            args: Prisma.ParkingSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>
          }
          deleteMany: {
            args: Prisma.ParkingSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ParkingSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ParkingSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>[]
          }
          upsert: {
            args: Prisma.ParkingSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParkingSessionPayload>
          }
          aggregate: {
            args: Prisma.ParkingSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateParkingSession>
          }
          groupBy: {
            args: Prisma.ParkingSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<ParkingSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.ParkingSessionCountArgs<ExtArgs>
            result: $Utils.Optional<ParkingSessionCountAggregateOutputType> | number
          }
        }
      }
      Ticket: {
        payload: Prisma.$TicketPayload<ExtArgs>
        fields: Prisma.TicketFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TicketFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TicketFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>
          }
          findFirst: {
            args: Prisma.TicketFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TicketFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>
          }
          findMany: {
            args: Prisma.TicketFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>[]
          }
          create: {
            args: Prisma.TicketCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>
          }
          createMany: {
            args: Prisma.TicketCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TicketCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>[]
          }
          delete: {
            args: Prisma.TicketDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>
          }
          update: {
            args: Prisma.TicketUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>
          }
          deleteMany: {
            args: Prisma.TicketDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TicketUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TicketUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>[]
          }
          upsert: {
            args: Prisma.TicketUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TicketPayload>
          }
          aggregate: {
            args: Prisma.TicketAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTicket>
          }
          groupBy: {
            args: Prisma.TicketGroupByArgs<ExtArgs>
            result: $Utils.Optional<TicketGroupByOutputType>[]
          }
          count: {
            args: Prisma.TicketCountArgs<ExtArgs>
            result: $Utils.Optional<TicketCountAggregateOutputType> | number
          }
        }
      }
      Payment: {
        payload: Prisma.$PaymentPayload<ExtArgs>
        fields: Prisma.PaymentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PaymentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PaymentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          findFirst: {
            args: Prisma.PaymentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PaymentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          findMany: {
            args: Prisma.PaymentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>[]
          }
          create: {
            args: Prisma.PaymentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          createMany: {
            args: Prisma.PaymentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PaymentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>[]
          }
          delete: {
            args: Prisma.PaymentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          update: {
            args: Prisma.PaymentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          deleteMany: {
            args: Prisma.PaymentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PaymentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PaymentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>[]
          }
          upsert: {
            args: Prisma.PaymentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentPayload>
          }
          aggregate: {
            args: Prisma.PaymentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePayment>
          }
          groupBy: {
            args: Prisma.PaymentGroupByArgs<ExtArgs>
            result: $Utils.Optional<PaymentGroupByOutputType>[]
          }
          count: {
            args: Prisma.PaymentCountArgs<ExtArgs>
            result: $Utils.Optional<PaymentCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    garage?: GarageOmit
    floor?: FloorOmit
    spot?: SpotOmit
    vehicle?: VehicleOmit
    parkingSession?: ParkingSessionOmit
    ticket?: TicketOmit
    payment?: PaymentOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type GarageCountOutputType
   */

  export type GarageCountOutputType = {
    floors: number
    spots: number
    sessions: number
    tickets: number
    payments: number
  }

  export type GarageCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    floors?: boolean | GarageCountOutputTypeCountFloorsArgs
    spots?: boolean | GarageCountOutputTypeCountSpotsArgs
    sessions?: boolean | GarageCountOutputTypeCountSessionsArgs
    tickets?: boolean | GarageCountOutputTypeCountTicketsArgs
    payments?: boolean | GarageCountOutputTypeCountPaymentsArgs
  }

  // Custom InputTypes
  /**
   * GarageCountOutputType without action
   */
  export type GarageCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GarageCountOutputType
     */
    select?: GarageCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * GarageCountOutputType without action
   */
  export type GarageCountOutputTypeCountFloorsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FloorWhereInput
  }

  /**
   * GarageCountOutputType without action
   */
  export type GarageCountOutputTypeCountSpotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SpotWhereInput
  }

  /**
   * GarageCountOutputType without action
   */
  export type GarageCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParkingSessionWhereInput
  }

  /**
   * GarageCountOutputType without action
   */
  export type GarageCountOutputTypeCountTicketsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TicketWhereInput
  }

  /**
   * GarageCountOutputType without action
   */
  export type GarageCountOutputTypeCountPaymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
  }


  /**
   * Count Type FloorCountOutputType
   */

  export type FloorCountOutputType = {
    spots: number
  }

  export type FloorCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    spots?: boolean | FloorCountOutputTypeCountSpotsArgs
  }

  // Custom InputTypes
  /**
   * FloorCountOutputType without action
   */
  export type FloorCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FloorCountOutputType
     */
    select?: FloorCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FloorCountOutputType without action
   */
  export type FloorCountOutputTypeCountSpotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SpotWhereInput
  }


  /**
   * Count Type SpotCountOutputType
   */

  export type SpotCountOutputType = {
    sessions: number
  }

  export type SpotCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | SpotCountOutputTypeCountSessionsArgs
  }

  // Custom InputTypes
  /**
   * SpotCountOutputType without action
   */
  export type SpotCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SpotCountOutputType
     */
    select?: SpotCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SpotCountOutputType without action
   */
  export type SpotCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParkingSessionWhereInput
  }


  /**
   * Count Type VehicleCountOutputType
   */

  export type VehicleCountOutputType = {
    sessions: number
    tickets: number
    payments: number
  }

  export type VehicleCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | VehicleCountOutputTypeCountSessionsArgs
    tickets?: boolean | VehicleCountOutputTypeCountTicketsArgs
    payments?: boolean | VehicleCountOutputTypeCountPaymentsArgs
  }

  // Custom InputTypes
  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VehicleCountOutputType
     */
    select?: VehicleCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParkingSessionWhereInput
  }

  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeCountTicketsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TicketWhereInput
  }

  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeCountPaymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
  }


  /**
   * Count Type ParkingSessionCountOutputType
   */

  export type ParkingSessionCountOutputType = {
    tickets: number
    payments: number
  }

  export type ParkingSessionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tickets?: boolean | ParkingSessionCountOutputTypeCountTicketsArgs
    payments?: boolean | ParkingSessionCountOutputTypeCountPaymentsArgs
  }

  // Custom InputTypes
  /**
   * ParkingSessionCountOutputType without action
   */
  export type ParkingSessionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSessionCountOutputType
     */
    select?: ParkingSessionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ParkingSessionCountOutputType without action
   */
  export type ParkingSessionCountOutputTypeCountTicketsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TicketWhereInput
  }

  /**
   * ParkingSessionCountOutputType without action
   */
  export type ParkingSessionCountOutputTypeCountPaymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
  }


  /**
   * Count Type TicketCountOutputType
   */

  export type TicketCountOutputType = {
    payments: number
  }

  export type TicketCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    payments?: boolean | TicketCountOutputTypeCountPaymentsArgs
  }

  // Custom InputTypes
  /**
   * TicketCountOutputType without action
   */
  export type TicketCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TicketCountOutputType
     */
    select?: TicketCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TicketCountOutputType without action
   */
  export type TicketCountOutputTypeCountPaymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Garage
   */

  export type AggregateGarage = {
    _count: GarageCountAggregateOutputType | null
    _avg: GarageAvgAggregateOutputType | null
    _sum: GarageSumAggregateOutputType | null
    _min: GarageMinAggregateOutputType | null
    _max: GarageMaxAggregateOutputType | null
  }

  export type GarageAvgAggregateOutputType = {
    totalFloors: number | null
    totalSpots: number | null
  }

  export type GarageSumAggregateOutputType = {
    totalFloors: number | null
    totalSpots: number | null
  }

  export type GarageMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    totalFloors: number | null
    totalSpots: number | null
    isActive: boolean | null
    operatingHours: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type GarageMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    totalFloors: number | null
    totalSpots: number | null
    isActive: boolean | null
    operatingHours: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type GarageCountAggregateOutputType = {
    id: number
    name: number
    description: number
    totalFloors: number
    totalSpots: number
    isActive: number
    operatingHours: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type GarageAvgAggregateInputType = {
    totalFloors?: true
    totalSpots?: true
  }

  export type GarageSumAggregateInputType = {
    totalFloors?: true
    totalSpots?: true
  }

  export type GarageMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    totalFloors?: true
    totalSpots?: true
    isActive?: true
    operatingHours?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type GarageMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    totalFloors?: true
    totalSpots?: true
    isActive?: true
    operatingHours?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type GarageCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    totalFloors?: true
    totalSpots?: true
    isActive?: true
    operatingHours?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type GarageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Garage to aggregate.
     */
    where?: GarageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Garages to fetch.
     */
    orderBy?: GarageOrderByWithRelationInput | GarageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GarageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Garages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Garages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Garages
    **/
    _count?: true | GarageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GarageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GarageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GarageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GarageMaxAggregateInputType
  }

  export type GetGarageAggregateType<T extends GarageAggregateArgs> = {
        [P in keyof T & keyof AggregateGarage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGarage[P]>
      : GetScalarType<T[P], AggregateGarage[P]>
  }




  export type GarageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GarageWhereInput
    orderBy?: GarageOrderByWithAggregationInput | GarageOrderByWithAggregationInput[]
    by: GarageScalarFieldEnum[] | GarageScalarFieldEnum
    having?: GarageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GarageCountAggregateInputType | true
    _avg?: GarageAvgAggregateInputType
    _sum?: GarageSumAggregateInputType
    _min?: GarageMinAggregateInputType
    _max?: GarageMaxAggregateInputType
  }

  export type GarageGroupByOutputType = {
    id: string
    name: string
    description: string | null
    totalFloors: number
    totalSpots: number
    isActive: boolean
    operatingHours: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: GarageCountAggregateOutputType | null
    _avg: GarageAvgAggregateOutputType | null
    _sum: GarageSumAggregateOutputType | null
    _min: GarageMinAggregateOutputType | null
    _max: GarageMaxAggregateOutputType | null
  }

  type GetGarageGroupByPayload<T extends GarageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GarageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GarageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GarageGroupByOutputType[P]>
            : GetScalarType<T[P], GarageGroupByOutputType[P]>
        }
      >
    >


  export type GarageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    totalFloors?: boolean
    totalSpots?: boolean
    isActive?: boolean
    operatingHours?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    floors?: boolean | Garage$floorsArgs<ExtArgs>
    spots?: boolean | Garage$spotsArgs<ExtArgs>
    sessions?: boolean | Garage$sessionsArgs<ExtArgs>
    tickets?: boolean | Garage$ticketsArgs<ExtArgs>
    payments?: boolean | Garage$paymentsArgs<ExtArgs>
    _count?: boolean | GarageCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["garage"]>

  export type GarageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    totalFloors?: boolean
    totalSpots?: boolean
    isActive?: boolean
    operatingHours?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["garage"]>

  export type GarageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    totalFloors?: boolean
    totalSpots?: boolean
    isActive?: boolean
    operatingHours?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["garage"]>

  export type GarageSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    totalFloors?: boolean
    totalSpots?: boolean
    isActive?: boolean
    operatingHours?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type GarageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "totalFloors" | "totalSpots" | "isActive" | "operatingHours" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["garage"]>
  export type GarageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    floors?: boolean | Garage$floorsArgs<ExtArgs>
    spots?: boolean | Garage$spotsArgs<ExtArgs>
    sessions?: boolean | Garage$sessionsArgs<ExtArgs>
    tickets?: boolean | Garage$ticketsArgs<ExtArgs>
    payments?: boolean | Garage$paymentsArgs<ExtArgs>
    _count?: boolean | GarageCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type GarageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type GarageIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $GaragePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Garage"
    objects: {
      floors: Prisma.$FloorPayload<ExtArgs>[]
      spots: Prisma.$SpotPayload<ExtArgs>[]
      sessions: Prisma.$ParkingSessionPayload<ExtArgs>[]
      tickets: Prisma.$TicketPayload<ExtArgs>[]
      payments: Prisma.$PaymentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string | null
      totalFloors: number
      totalSpots: number
      isActive: boolean
      operatingHours: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["garage"]>
    composites: {}
  }

  type GarageGetPayload<S extends boolean | null | undefined | GarageDefaultArgs> = $Result.GetResult<Prisma.$GaragePayload, S>

  type GarageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GarageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GarageCountAggregateInputType | true
    }

  export interface GarageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Garage'], meta: { name: 'Garage' } }
    /**
     * Find zero or one Garage that matches the filter.
     * @param {GarageFindUniqueArgs} args - Arguments to find a Garage
     * @example
     * // Get one Garage
     * const garage = await prisma.garage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GarageFindUniqueArgs>(args: SelectSubset<T, GarageFindUniqueArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Garage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GarageFindUniqueOrThrowArgs} args - Arguments to find a Garage
     * @example
     * // Get one Garage
     * const garage = await prisma.garage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GarageFindUniqueOrThrowArgs>(args: SelectSubset<T, GarageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Garage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageFindFirstArgs} args - Arguments to find a Garage
     * @example
     * // Get one Garage
     * const garage = await prisma.garage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GarageFindFirstArgs>(args?: SelectSubset<T, GarageFindFirstArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Garage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageFindFirstOrThrowArgs} args - Arguments to find a Garage
     * @example
     * // Get one Garage
     * const garage = await prisma.garage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GarageFindFirstOrThrowArgs>(args?: SelectSubset<T, GarageFindFirstOrThrowArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Garages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Garages
     * const garages = await prisma.garage.findMany()
     * 
     * // Get first 10 Garages
     * const garages = await prisma.garage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const garageWithIdOnly = await prisma.garage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GarageFindManyArgs>(args?: SelectSubset<T, GarageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Garage.
     * @param {GarageCreateArgs} args - Arguments to create a Garage.
     * @example
     * // Create one Garage
     * const Garage = await prisma.garage.create({
     *   data: {
     *     // ... data to create a Garage
     *   }
     * })
     * 
     */
    create<T extends GarageCreateArgs>(args: SelectSubset<T, GarageCreateArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Garages.
     * @param {GarageCreateManyArgs} args - Arguments to create many Garages.
     * @example
     * // Create many Garages
     * const garage = await prisma.garage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GarageCreateManyArgs>(args?: SelectSubset<T, GarageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Garages and returns the data saved in the database.
     * @param {GarageCreateManyAndReturnArgs} args - Arguments to create many Garages.
     * @example
     * // Create many Garages
     * const garage = await prisma.garage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Garages and only return the `id`
     * const garageWithIdOnly = await prisma.garage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GarageCreateManyAndReturnArgs>(args?: SelectSubset<T, GarageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Garage.
     * @param {GarageDeleteArgs} args - Arguments to delete one Garage.
     * @example
     * // Delete one Garage
     * const Garage = await prisma.garage.delete({
     *   where: {
     *     // ... filter to delete one Garage
     *   }
     * })
     * 
     */
    delete<T extends GarageDeleteArgs>(args: SelectSubset<T, GarageDeleteArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Garage.
     * @param {GarageUpdateArgs} args - Arguments to update one Garage.
     * @example
     * // Update one Garage
     * const garage = await prisma.garage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GarageUpdateArgs>(args: SelectSubset<T, GarageUpdateArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Garages.
     * @param {GarageDeleteManyArgs} args - Arguments to filter Garages to delete.
     * @example
     * // Delete a few Garages
     * const { count } = await prisma.garage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GarageDeleteManyArgs>(args?: SelectSubset<T, GarageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Garages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Garages
     * const garage = await prisma.garage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GarageUpdateManyArgs>(args: SelectSubset<T, GarageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Garages and returns the data updated in the database.
     * @param {GarageUpdateManyAndReturnArgs} args - Arguments to update many Garages.
     * @example
     * // Update many Garages
     * const garage = await prisma.garage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Garages and only return the `id`
     * const garageWithIdOnly = await prisma.garage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GarageUpdateManyAndReturnArgs>(args: SelectSubset<T, GarageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Garage.
     * @param {GarageUpsertArgs} args - Arguments to update or create a Garage.
     * @example
     * // Update or create a Garage
     * const garage = await prisma.garage.upsert({
     *   create: {
     *     // ... data to create a Garage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Garage we want to update
     *   }
     * })
     */
    upsert<T extends GarageUpsertArgs>(args: SelectSubset<T, GarageUpsertArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Garages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageCountArgs} args - Arguments to filter Garages to count.
     * @example
     * // Count the number of Garages
     * const count = await prisma.garage.count({
     *   where: {
     *     // ... the filter for the Garages we want to count
     *   }
     * })
    **/
    count<T extends GarageCountArgs>(
      args?: Subset<T, GarageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GarageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Garage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GarageAggregateArgs>(args: Subset<T, GarageAggregateArgs>): Prisma.PrismaPromise<GetGarageAggregateType<T>>

    /**
     * Group by Garage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GarageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GarageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GarageGroupByArgs['orderBy'] }
        : { orderBy?: GarageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GarageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGarageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Garage model
   */
  readonly fields: GarageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Garage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GarageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    floors<T extends Garage$floorsArgs<ExtArgs> = {}>(args?: Subset<T, Garage$floorsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    spots<T extends Garage$spotsArgs<ExtArgs> = {}>(args?: Subset<T, Garage$spotsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends Garage$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, Garage$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tickets<T extends Garage$ticketsArgs<ExtArgs> = {}>(args?: Subset<T, Garage$ticketsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    payments<T extends Garage$paymentsArgs<ExtArgs> = {}>(args?: Subset<T, Garage$paymentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Garage model
   */
  interface GarageFieldRefs {
    readonly id: FieldRef<"Garage", 'String'>
    readonly name: FieldRef<"Garage", 'String'>
    readonly description: FieldRef<"Garage", 'String'>
    readonly totalFloors: FieldRef<"Garage", 'Int'>
    readonly totalSpots: FieldRef<"Garage", 'Int'>
    readonly isActive: FieldRef<"Garage", 'Boolean'>
    readonly operatingHours: FieldRef<"Garage", 'String'>
    readonly createdAt: FieldRef<"Garage", 'DateTime'>
    readonly updatedAt: FieldRef<"Garage", 'DateTime'>
    readonly deletedAt: FieldRef<"Garage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Garage findUnique
   */
  export type GarageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * Filter, which Garage to fetch.
     */
    where: GarageWhereUniqueInput
  }

  /**
   * Garage findUniqueOrThrow
   */
  export type GarageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * Filter, which Garage to fetch.
     */
    where: GarageWhereUniqueInput
  }

  /**
   * Garage findFirst
   */
  export type GarageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * Filter, which Garage to fetch.
     */
    where?: GarageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Garages to fetch.
     */
    orderBy?: GarageOrderByWithRelationInput | GarageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Garages.
     */
    cursor?: GarageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Garages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Garages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Garages.
     */
    distinct?: GarageScalarFieldEnum | GarageScalarFieldEnum[]
  }

  /**
   * Garage findFirstOrThrow
   */
  export type GarageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * Filter, which Garage to fetch.
     */
    where?: GarageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Garages to fetch.
     */
    orderBy?: GarageOrderByWithRelationInput | GarageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Garages.
     */
    cursor?: GarageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Garages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Garages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Garages.
     */
    distinct?: GarageScalarFieldEnum | GarageScalarFieldEnum[]
  }

  /**
   * Garage findMany
   */
  export type GarageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * Filter, which Garages to fetch.
     */
    where?: GarageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Garages to fetch.
     */
    orderBy?: GarageOrderByWithRelationInput | GarageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Garages.
     */
    cursor?: GarageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Garages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Garages.
     */
    skip?: number
    distinct?: GarageScalarFieldEnum | GarageScalarFieldEnum[]
  }

  /**
   * Garage create
   */
  export type GarageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * The data needed to create a Garage.
     */
    data: XOR<GarageCreateInput, GarageUncheckedCreateInput>
  }

  /**
   * Garage createMany
   */
  export type GarageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Garages.
     */
    data: GarageCreateManyInput | GarageCreateManyInput[]
  }

  /**
   * Garage createManyAndReturn
   */
  export type GarageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * The data used to create many Garages.
     */
    data: GarageCreateManyInput | GarageCreateManyInput[]
  }

  /**
   * Garage update
   */
  export type GarageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * The data needed to update a Garage.
     */
    data: XOR<GarageUpdateInput, GarageUncheckedUpdateInput>
    /**
     * Choose, which Garage to update.
     */
    where: GarageWhereUniqueInput
  }

  /**
   * Garage updateMany
   */
  export type GarageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Garages.
     */
    data: XOR<GarageUpdateManyMutationInput, GarageUncheckedUpdateManyInput>
    /**
     * Filter which Garages to update
     */
    where?: GarageWhereInput
    /**
     * Limit how many Garages to update.
     */
    limit?: number
  }

  /**
   * Garage updateManyAndReturn
   */
  export type GarageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * The data used to update Garages.
     */
    data: XOR<GarageUpdateManyMutationInput, GarageUncheckedUpdateManyInput>
    /**
     * Filter which Garages to update
     */
    where?: GarageWhereInput
    /**
     * Limit how many Garages to update.
     */
    limit?: number
  }

  /**
   * Garage upsert
   */
  export type GarageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * The filter to search for the Garage to update in case it exists.
     */
    where: GarageWhereUniqueInput
    /**
     * In case the Garage found by the `where` argument doesn't exist, create a new Garage with this data.
     */
    create: XOR<GarageCreateInput, GarageUncheckedCreateInput>
    /**
     * In case the Garage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GarageUpdateInput, GarageUncheckedUpdateInput>
  }

  /**
   * Garage delete
   */
  export type GarageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
    /**
     * Filter which Garage to delete.
     */
    where: GarageWhereUniqueInput
  }

  /**
   * Garage deleteMany
   */
  export type GarageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Garages to delete
     */
    where?: GarageWhereInput
    /**
     * Limit how many Garages to delete.
     */
    limit?: number
  }

  /**
   * Garage.floors
   */
  export type Garage$floorsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    where?: FloorWhereInput
    orderBy?: FloorOrderByWithRelationInput | FloorOrderByWithRelationInput[]
    cursor?: FloorWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FloorScalarFieldEnum | FloorScalarFieldEnum[]
  }

  /**
   * Garage.spots
   */
  export type Garage$spotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    where?: SpotWhereInput
    orderBy?: SpotOrderByWithRelationInput | SpotOrderByWithRelationInput[]
    cursor?: SpotWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SpotScalarFieldEnum | SpotScalarFieldEnum[]
  }

  /**
   * Garage.sessions
   */
  export type Garage$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    where?: ParkingSessionWhereInput
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    cursor?: ParkingSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ParkingSessionScalarFieldEnum | ParkingSessionScalarFieldEnum[]
  }

  /**
   * Garage.tickets
   */
  export type Garage$ticketsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    where?: TicketWhereInput
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    cursor?: TicketWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TicketScalarFieldEnum | TicketScalarFieldEnum[]
  }

  /**
   * Garage.payments
   */
  export type Garage$paymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    cursor?: PaymentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Garage without action
   */
  export type GarageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Garage
     */
    select?: GarageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Garage
     */
    omit?: GarageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GarageInclude<ExtArgs> | null
  }


  /**
   * Model Floor
   */

  export type AggregateFloor = {
    _count: FloorCountAggregateOutputType | null
    _avg: FloorAvgAggregateOutputType | null
    _sum: FloorSumAggregateOutputType | null
    _min: FloorMinAggregateOutputType | null
    _max: FloorMaxAggregateOutputType | null
  }

  export type FloorAvgAggregateOutputType = {
    number: number | null
    bays: number | null
    spotsPerBay: number | null
  }

  export type FloorSumAggregateOutputType = {
    number: number | null
    bays: number | null
    spotsPerBay: number | null
  }

  export type FloorMinAggregateOutputType = {
    id: string | null
    garageId: string | null
    number: number | null
    name: string | null
    bays: number | null
    spotsPerBay: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type FloorMaxAggregateOutputType = {
    id: string | null
    garageId: string | null
    number: number | null
    name: string | null
    bays: number | null
    spotsPerBay: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type FloorCountAggregateOutputType = {
    id: number
    garageId: number
    number: number
    name: number
    bays: number
    spotsPerBay: number
    isActive: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type FloorAvgAggregateInputType = {
    number?: true
    bays?: true
    spotsPerBay?: true
  }

  export type FloorSumAggregateInputType = {
    number?: true
    bays?: true
    spotsPerBay?: true
  }

  export type FloorMinAggregateInputType = {
    id?: true
    garageId?: true
    number?: true
    name?: true
    bays?: true
    spotsPerBay?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type FloorMaxAggregateInputType = {
    id?: true
    garageId?: true
    number?: true
    name?: true
    bays?: true
    spotsPerBay?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type FloorCountAggregateInputType = {
    id?: true
    garageId?: true
    number?: true
    name?: true
    bays?: true
    spotsPerBay?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type FloorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Floor to aggregate.
     */
    where?: FloorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Floors to fetch.
     */
    orderBy?: FloorOrderByWithRelationInput | FloorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FloorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Floors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Floors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Floors
    **/
    _count?: true | FloorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FloorAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FloorSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FloorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FloorMaxAggregateInputType
  }

  export type GetFloorAggregateType<T extends FloorAggregateArgs> = {
        [P in keyof T & keyof AggregateFloor]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFloor[P]>
      : GetScalarType<T[P], AggregateFloor[P]>
  }




  export type FloorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FloorWhereInput
    orderBy?: FloorOrderByWithAggregationInput | FloorOrderByWithAggregationInput[]
    by: FloorScalarFieldEnum[] | FloorScalarFieldEnum
    having?: FloorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FloorCountAggregateInputType | true
    _avg?: FloorAvgAggregateInputType
    _sum?: FloorSumAggregateInputType
    _min?: FloorMinAggregateInputType
    _max?: FloorMaxAggregateInputType
  }

  export type FloorGroupByOutputType = {
    id: string
    garageId: string
    number: number
    name: string | null
    bays: number
    spotsPerBay: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: FloorCountAggregateOutputType | null
    _avg: FloorAvgAggregateOutputType | null
    _sum: FloorSumAggregateOutputType | null
    _min: FloorMinAggregateOutputType | null
    _max: FloorMaxAggregateOutputType | null
  }

  type GetFloorGroupByPayload<T extends FloorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FloorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FloorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FloorGroupByOutputType[P]>
            : GetScalarType<T[P], FloorGroupByOutputType[P]>
        }
      >
    >


  export type FloorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    number?: boolean
    name?: boolean
    bays?: boolean
    spotsPerBay?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spots?: boolean | Floor$spotsArgs<ExtArgs>
    _count?: boolean | FloorCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["floor"]>

  export type FloorSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    number?: boolean
    name?: boolean
    bays?: boolean
    spotsPerBay?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["floor"]>

  export type FloorSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    number?: boolean
    name?: boolean
    bays?: boolean
    spotsPerBay?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["floor"]>

  export type FloorSelectScalar = {
    id?: boolean
    garageId?: boolean
    number?: boolean
    name?: boolean
    bays?: boolean
    spotsPerBay?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type FloorOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "garageId" | "number" | "name" | "bays" | "spotsPerBay" | "isActive" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["floor"]>
  export type FloorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spots?: boolean | Floor$spotsArgs<ExtArgs>
    _count?: boolean | FloorCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FloorIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
  }
  export type FloorIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
  }

  export type $FloorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Floor"
    objects: {
      garage: Prisma.$GaragePayload<ExtArgs>
      spots: Prisma.$SpotPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      garageId: string
      number: number
      name: string | null
      bays: number
      spotsPerBay: number
      isActive: boolean
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["floor"]>
    composites: {}
  }

  type FloorGetPayload<S extends boolean | null | undefined | FloorDefaultArgs> = $Result.GetResult<Prisma.$FloorPayload, S>

  type FloorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FloorFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FloorCountAggregateInputType | true
    }

  export interface FloorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Floor'], meta: { name: 'Floor' } }
    /**
     * Find zero or one Floor that matches the filter.
     * @param {FloorFindUniqueArgs} args - Arguments to find a Floor
     * @example
     * // Get one Floor
     * const floor = await prisma.floor.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FloorFindUniqueArgs>(args: SelectSubset<T, FloorFindUniqueArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Floor that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FloorFindUniqueOrThrowArgs} args - Arguments to find a Floor
     * @example
     * // Get one Floor
     * const floor = await prisma.floor.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FloorFindUniqueOrThrowArgs>(args: SelectSubset<T, FloorFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Floor that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorFindFirstArgs} args - Arguments to find a Floor
     * @example
     * // Get one Floor
     * const floor = await prisma.floor.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FloorFindFirstArgs>(args?: SelectSubset<T, FloorFindFirstArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Floor that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorFindFirstOrThrowArgs} args - Arguments to find a Floor
     * @example
     * // Get one Floor
     * const floor = await prisma.floor.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FloorFindFirstOrThrowArgs>(args?: SelectSubset<T, FloorFindFirstOrThrowArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Floors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Floors
     * const floors = await prisma.floor.findMany()
     * 
     * // Get first 10 Floors
     * const floors = await prisma.floor.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const floorWithIdOnly = await prisma.floor.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FloorFindManyArgs>(args?: SelectSubset<T, FloorFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Floor.
     * @param {FloorCreateArgs} args - Arguments to create a Floor.
     * @example
     * // Create one Floor
     * const Floor = await prisma.floor.create({
     *   data: {
     *     // ... data to create a Floor
     *   }
     * })
     * 
     */
    create<T extends FloorCreateArgs>(args: SelectSubset<T, FloorCreateArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Floors.
     * @param {FloorCreateManyArgs} args - Arguments to create many Floors.
     * @example
     * // Create many Floors
     * const floor = await prisma.floor.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FloorCreateManyArgs>(args?: SelectSubset<T, FloorCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Floors and returns the data saved in the database.
     * @param {FloorCreateManyAndReturnArgs} args - Arguments to create many Floors.
     * @example
     * // Create many Floors
     * const floor = await prisma.floor.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Floors and only return the `id`
     * const floorWithIdOnly = await prisma.floor.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FloorCreateManyAndReturnArgs>(args?: SelectSubset<T, FloorCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Floor.
     * @param {FloorDeleteArgs} args - Arguments to delete one Floor.
     * @example
     * // Delete one Floor
     * const Floor = await prisma.floor.delete({
     *   where: {
     *     // ... filter to delete one Floor
     *   }
     * })
     * 
     */
    delete<T extends FloorDeleteArgs>(args: SelectSubset<T, FloorDeleteArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Floor.
     * @param {FloorUpdateArgs} args - Arguments to update one Floor.
     * @example
     * // Update one Floor
     * const floor = await prisma.floor.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FloorUpdateArgs>(args: SelectSubset<T, FloorUpdateArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Floors.
     * @param {FloorDeleteManyArgs} args - Arguments to filter Floors to delete.
     * @example
     * // Delete a few Floors
     * const { count } = await prisma.floor.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FloorDeleteManyArgs>(args?: SelectSubset<T, FloorDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Floors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Floors
     * const floor = await prisma.floor.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FloorUpdateManyArgs>(args: SelectSubset<T, FloorUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Floors and returns the data updated in the database.
     * @param {FloorUpdateManyAndReturnArgs} args - Arguments to update many Floors.
     * @example
     * // Update many Floors
     * const floor = await prisma.floor.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Floors and only return the `id`
     * const floorWithIdOnly = await prisma.floor.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FloorUpdateManyAndReturnArgs>(args: SelectSubset<T, FloorUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Floor.
     * @param {FloorUpsertArgs} args - Arguments to update or create a Floor.
     * @example
     * // Update or create a Floor
     * const floor = await prisma.floor.upsert({
     *   create: {
     *     // ... data to create a Floor
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Floor we want to update
     *   }
     * })
     */
    upsert<T extends FloorUpsertArgs>(args: SelectSubset<T, FloorUpsertArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Floors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorCountArgs} args - Arguments to filter Floors to count.
     * @example
     * // Count the number of Floors
     * const count = await prisma.floor.count({
     *   where: {
     *     // ... the filter for the Floors we want to count
     *   }
     * })
    **/
    count<T extends FloorCountArgs>(
      args?: Subset<T, FloorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FloorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Floor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FloorAggregateArgs>(args: Subset<T, FloorAggregateArgs>): Prisma.PrismaPromise<GetFloorAggregateType<T>>

    /**
     * Group by Floor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FloorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FloorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FloorGroupByArgs['orderBy'] }
        : { orderBy?: FloorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FloorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFloorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Floor model
   */
  readonly fields: FloorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Floor.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FloorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    garage<T extends GarageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GarageDefaultArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    spots<T extends Floor$spotsArgs<ExtArgs> = {}>(args?: Subset<T, Floor$spotsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Floor model
   */
  interface FloorFieldRefs {
    readonly id: FieldRef<"Floor", 'String'>
    readonly garageId: FieldRef<"Floor", 'String'>
    readonly number: FieldRef<"Floor", 'Int'>
    readonly name: FieldRef<"Floor", 'String'>
    readonly bays: FieldRef<"Floor", 'Int'>
    readonly spotsPerBay: FieldRef<"Floor", 'Int'>
    readonly isActive: FieldRef<"Floor", 'Boolean'>
    readonly createdAt: FieldRef<"Floor", 'DateTime'>
    readonly updatedAt: FieldRef<"Floor", 'DateTime'>
    readonly deletedAt: FieldRef<"Floor", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Floor findUnique
   */
  export type FloorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * Filter, which Floor to fetch.
     */
    where: FloorWhereUniqueInput
  }

  /**
   * Floor findUniqueOrThrow
   */
  export type FloorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * Filter, which Floor to fetch.
     */
    where: FloorWhereUniqueInput
  }

  /**
   * Floor findFirst
   */
  export type FloorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * Filter, which Floor to fetch.
     */
    where?: FloorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Floors to fetch.
     */
    orderBy?: FloorOrderByWithRelationInput | FloorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Floors.
     */
    cursor?: FloorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Floors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Floors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Floors.
     */
    distinct?: FloorScalarFieldEnum | FloorScalarFieldEnum[]
  }

  /**
   * Floor findFirstOrThrow
   */
  export type FloorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * Filter, which Floor to fetch.
     */
    where?: FloorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Floors to fetch.
     */
    orderBy?: FloorOrderByWithRelationInput | FloorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Floors.
     */
    cursor?: FloorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Floors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Floors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Floors.
     */
    distinct?: FloorScalarFieldEnum | FloorScalarFieldEnum[]
  }

  /**
   * Floor findMany
   */
  export type FloorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * Filter, which Floors to fetch.
     */
    where?: FloorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Floors to fetch.
     */
    orderBy?: FloorOrderByWithRelationInput | FloorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Floors.
     */
    cursor?: FloorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Floors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Floors.
     */
    skip?: number
    distinct?: FloorScalarFieldEnum | FloorScalarFieldEnum[]
  }

  /**
   * Floor create
   */
  export type FloorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * The data needed to create a Floor.
     */
    data: XOR<FloorCreateInput, FloorUncheckedCreateInput>
  }

  /**
   * Floor createMany
   */
  export type FloorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Floors.
     */
    data: FloorCreateManyInput | FloorCreateManyInput[]
  }

  /**
   * Floor createManyAndReturn
   */
  export type FloorCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * The data used to create many Floors.
     */
    data: FloorCreateManyInput | FloorCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Floor update
   */
  export type FloorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * The data needed to update a Floor.
     */
    data: XOR<FloorUpdateInput, FloorUncheckedUpdateInput>
    /**
     * Choose, which Floor to update.
     */
    where: FloorWhereUniqueInput
  }

  /**
   * Floor updateMany
   */
  export type FloorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Floors.
     */
    data: XOR<FloorUpdateManyMutationInput, FloorUncheckedUpdateManyInput>
    /**
     * Filter which Floors to update
     */
    where?: FloorWhereInput
    /**
     * Limit how many Floors to update.
     */
    limit?: number
  }

  /**
   * Floor updateManyAndReturn
   */
  export type FloorUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * The data used to update Floors.
     */
    data: XOR<FloorUpdateManyMutationInput, FloorUncheckedUpdateManyInput>
    /**
     * Filter which Floors to update
     */
    where?: FloorWhereInput
    /**
     * Limit how many Floors to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Floor upsert
   */
  export type FloorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * The filter to search for the Floor to update in case it exists.
     */
    where: FloorWhereUniqueInput
    /**
     * In case the Floor found by the `where` argument doesn't exist, create a new Floor with this data.
     */
    create: XOR<FloorCreateInput, FloorUncheckedCreateInput>
    /**
     * In case the Floor was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FloorUpdateInput, FloorUncheckedUpdateInput>
  }

  /**
   * Floor delete
   */
  export type FloorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    /**
     * Filter which Floor to delete.
     */
    where: FloorWhereUniqueInput
  }

  /**
   * Floor deleteMany
   */
  export type FloorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Floors to delete
     */
    where?: FloorWhereInput
    /**
     * Limit how many Floors to delete.
     */
    limit?: number
  }

  /**
   * Floor.spots
   */
  export type Floor$spotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    where?: SpotWhereInput
    orderBy?: SpotOrderByWithRelationInput | SpotOrderByWithRelationInput[]
    cursor?: SpotWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SpotScalarFieldEnum | SpotScalarFieldEnum[]
  }

  /**
   * Floor without action
   */
  export type FloorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
  }


  /**
   * Model Spot
   */

  export type AggregateSpot = {
    _count: SpotCountAggregateOutputType | null
    _avg: SpotAvgAggregateOutputType | null
    _sum: SpotSumAggregateOutputType | null
    _min: SpotMinAggregateOutputType | null
    _max: SpotMaxAggregateOutputType | null
  }

  export type SpotAvgAggregateOutputType = {
    floor: number | null
    bay: number | null
  }

  export type SpotSumAggregateOutputType = {
    floor: number | null
    bay: number | null
  }

  export type SpotMinAggregateOutputType = {
    id: string | null
    garageId: string | null
    floorId: string | null
    floor: number | null
    bay: number | null
    spotNumber: string | null
    type: $Enums.SpotType | null
    status: $Enums.SpotStatus | null
    features: string | null
    currentVehicleId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type SpotMaxAggregateOutputType = {
    id: string | null
    garageId: string | null
    floorId: string | null
    floor: number | null
    bay: number | null
    spotNumber: string | null
    type: $Enums.SpotType | null
    status: $Enums.SpotStatus | null
    features: string | null
    currentVehicleId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type SpotCountAggregateOutputType = {
    id: number
    garageId: number
    floorId: number
    floor: number
    bay: number
    spotNumber: number
    type: number
    status: number
    features: number
    currentVehicleId: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type SpotAvgAggregateInputType = {
    floor?: true
    bay?: true
  }

  export type SpotSumAggregateInputType = {
    floor?: true
    bay?: true
  }

  export type SpotMinAggregateInputType = {
    id?: true
    garageId?: true
    floorId?: true
    floor?: true
    bay?: true
    spotNumber?: true
    type?: true
    status?: true
    features?: true
    currentVehicleId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type SpotMaxAggregateInputType = {
    id?: true
    garageId?: true
    floorId?: true
    floor?: true
    bay?: true
    spotNumber?: true
    type?: true
    status?: true
    features?: true
    currentVehicleId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type SpotCountAggregateInputType = {
    id?: true
    garageId?: true
    floorId?: true
    floor?: true
    bay?: true
    spotNumber?: true
    type?: true
    status?: true
    features?: true
    currentVehicleId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type SpotAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Spot to aggregate.
     */
    where?: SpotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Spots to fetch.
     */
    orderBy?: SpotOrderByWithRelationInput | SpotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SpotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Spots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Spots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Spots
    **/
    _count?: true | SpotCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SpotAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SpotSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SpotMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SpotMaxAggregateInputType
  }

  export type GetSpotAggregateType<T extends SpotAggregateArgs> = {
        [P in keyof T & keyof AggregateSpot]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSpot[P]>
      : GetScalarType<T[P], AggregateSpot[P]>
  }




  export type SpotGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SpotWhereInput
    orderBy?: SpotOrderByWithAggregationInput | SpotOrderByWithAggregationInput[]
    by: SpotScalarFieldEnum[] | SpotScalarFieldEnum
    having?: SpotScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SpotCountAggregateInputType | true
    _avg?: SpotAvgAggregateInputType
    _sum?: SpotSumAggregateInputType
    _min?: SpotMinAggregateInputType
    _max?: SpotMaxAggregateInputType
  }

  export type SpotGroupByOutputType = {
    id: string
    garageId: string
    floorId: string | null
    floor: number
    bay: number
    spotNumber: string
    type: $Enums.SpotType
    status: $Enums.SpotStatus
    features: string
    currentVehicleId: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: SpotCountAggregateOutputType | null
    _avg: SpotAvgAggregateOutputType | null
    _sum: SpotSumAggregateOutputType | null
    _min: SpotMinAggregateOutputType | null
    _max: SpotMaxAggregateOutputType | null
  }

  type GetSpotGroupByPayload<T extends SpotGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SpotGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SpotGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SpotGroupByOutputType[P]>
            : GetScalarType<T[P], SpotGroupByOutputType[P]>
        }
      >
    >


  export type SpotSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    floorId?: boolean
    floor?: boolean
    bay?: boolean
    spotNumber?: boolean
    type?: boolean
    status?: boolean
    features?: boolean
    currentVehicleId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    floorRel?: boolean | Spot$floorRelArgs<ExtArgs>
    currentVehicle?: boolean | Spot$currentVehicleArgs<ExtArgs>
    sessions?: boolean | Spot$sessionsArgs<ExtArgs>
    _count?: boolean | SpotCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["spot"]>

  export type SpotSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    floorId?: boolean
    floor?: boolean
    bay?: boolean
    spotNumber?: boolean
    type?: boolean
    status?: boolean
    features?: boolean
    currentVehicleId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    floorRel?: boolean | Spot$floorRelArgs<ExtArgs>
    currentVehicle?: boolean | Spot$currentVehicleArgs<ExtArgs>
  }, ExtArgs["result"]["spot"]>

  export type SpotSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    floorId?: boolean
    floor?: boolean
    bay?: boolean
    spotNumber?: boolean
    type?: boolean
    status?: boolean
    features?: boolean
    currentVehicleId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    floorRel?: boolean | Spot$floorRelArgs<ExtArgs>
    currentVehicle?: boolean | Spot$currentVehicleArgs<ExtArgs>
  }, ExtArgs["result"]["spot"]>

  export type SpotSelectScalar = {
    id?: boolean
    garageId?: boolean
    floorId?: boolean
    floor?: boolean
    bay?: boolean
    spotNumber?: boolean
    type?: boolean
    status?: boolean
    features?: boolean
    currentVehicleId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type SpotOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "garageId" | "floorId" | "floor" | "bay" | "spotNumber" | "type" | "status" | "features" | "currentVehicleId" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["spot"]>
  export type SpotInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    floorRel?: boolean | Spot$floorRelArgs<ExtArgs>
    currentVehicle?: boolean | Spot$currentVehicleArgs<ExtArgs>
    sessions?: boolean | Spot$sessionsArgs<ExtArgs>
    _count?: boolean | SpotCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type SpotIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    floorRel?: boolean | Spot$floorRelArgs<ExtArgs>
    currentVehicle?: boolean | Spot$currentVehicleArgs<ExtArgs>
  }
  export type SpotIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    floorRel?: boolean | Spot$floorRelArgs<ExtArgs>
    currentVehicle?: boolean | Spot$currentVehicleArgs<ExtArgs>
  }

  export type $SpotPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Spot"
    objects: {
      garage: Prisma.$GaragePayload<ExtArgs>
      floorRel: Prisma.$FloorPayload<ExtArgs> | null
      currentVehicle: Prisma.$VehiclePayload<ExtArgs> | null
      sessions: Prisma.$ParkingSessionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      garageId: string
      floorId: string | null
      floor: number
      bay: number
      spotNumber: string
      type: $Enums.SpotType
      status: $Enums.SpotStatus
      features: string
      currentVehicleId: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["spot"]>
    composites: {}
  }

  type SpotGetPayload<S extends boolean | null | undefined | SpotDefaultArgs> = $Result.GetResult<Prisma.$SpotPayload, S>

  type SpotCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SpotFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SpotCountAggregateInputType | true
    }

  export interface SpotDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Spot'], meta: { name: 'Spot' } }
    /**
     * Find zero or one Spot that matches the filter.
     * @param {SpotFindUniqueArgs} args - Arguments to find a Spot
     * @example
     * // Get one Spot
     * const spot = await prisma.spot.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SpotFindUniqueArgs>(args: SelectSubset<T, SpotFindUniqueArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Spot that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SpotFindUniqueOrThrowArgs} args - Arguments to find a Spot
     * @example
     * // Get one Spot
     * const spot = await prisma.spot.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SpotFindUniqueOrThrowArgs>(args: SelectSubset<T, SpotFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Spot that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotFindFirstArgs} args - Arguments to find a Spot
     * @example
     * // Get one Spot
     * const spot = await prisma.spot.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SpotFindFirstArgs>(args?: SelectSubset<T, SpotFindFirstArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Spot that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotFindFirstOrThrowArgs} args - Arguments to find a Spot
     * @example
     * // Get one Spot
     * const spot = await prisma.spot.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SpotFindFirstOrThrowArgs>(args?: SelectSubset<T, SpotFindFirstOrThrowArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Spots that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Spots
     * const spots = await prisma.spot.findMany()
     * 
     * // Get first 10 Spots
     * const spots = await prisma.spot.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const spotWithIdOnly = await prisma.spot.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SpotFindManyArgs>(args?: SelectSubset<T, SpotFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Spot.
     * @param {SpotCreateArgs} args - Arguments to create a Spot.
     * @example
     * // Create one Spot
     * const Spot = await prisma.spot.create({
     *   data: {
     *     // ... data to create a Spot
     *   }
     * })
     * 
     */
    create<T extends SpotCreateArgs>(args: SelectSubset<T, SpotCreateArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Spots.
     * @param {SpotCreateManyArgs} args - Arguments to create many Spots.
     * @example
     * // Create many Spots
     * const spot = await prisma.spot.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SpotCreateManyArgs>(args?: SelectSubset<T, SpotCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Spots and returns the data saved in the database.
     * @param {SpotCreateManyAndReturnArgs} args - Arguments to create many Spots.
     * @example
     * // Create many Spots
     * const spot = await prisma.spot.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Spots and only return the `id`
     * const spotWithIdOnly = await prisma.spot.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SpotCreateManyAndReturnArgs>(args?: SelectSubset<T, SpotCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Spot.
     * @param {SpotDeleteArgs} args - Arguments to delete one Spot.
     * @example
     * // Delete one Spot
     * const Spot = await prisma.spot.delete({
     *   where: {
     *     // ... filter to delete one Spot
     *   }
     * })
     * 
     */
    delete<T extends SpotDeleteArgs>(args: SelectSubset<T, SpotDeleteArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Spot.
     * @param {SpotUpdateArgs} args - Arguments to update one Spot.
     * @example
     * // Update one Spot
     * const spot = await prisma.spot.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SpotUpdateArgs>(args: SelectSubset<T, SpotUpdateArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Spots.
     * @param {SpotDeleteManyArgs} args - Arguments to filter Spots to delete.
     * @example
     * // Delete a few Spots
     * const { count } = await prisma.spot.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SpotDeleteManyArgs>(args?: SelectSubset<T, SpotDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Spots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Spots
     * const spot = await prisma.spot.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SpotUpdateManyArgs>(args: SelectSubset<T, SpotUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Spots and returns the data updated in the database.
     * @param {SpotUpdateManyAndReturnArgs} args - Arguments to update many Spots.
     * @example
     * // Update many Spots
     * const spot = await prisma.spot.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Spots and only return the `id`
     * const spotWithIdOnly = await prisma.spot.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SpotUpdateManyAndReturnArgs>(args: SelectSubset<T, SpotUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Spot.
     * @param {SpotUpsertArgs} args - Arguments to update or create a Spot.
     * @example
     * // Update or create a Spot
     * const spot = await prisma.spot.upsert({
     *   create: {
     *     // ... data to create a Spot
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Spot we want to update
     *   }
     * })
     */
    upsert<T extends SpotUpsertArgs>(args: SelectSubset<T, SpotUpsertArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Spots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotCountArgs} args - Arguments to filter Spots to count.
     * @example
     * // Count the number of Spots
     * const count = await prisma.spot.count({
     *   where: {
     *     // ... the filter for the Spots we want to count
     *   }
     * })
    **/
    count<T extends SpotCountArgs>(
      args?: Subset<T, SpotCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SpotCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Spot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SpotAggregateArgs>(args: Subset<T, SpotAggregateArgs>): Prisma.PrismaPromise<GetSpotAggregateType<T>>

    /**
     * Group by Spot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SpotGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SpotGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SpotGroupByArgs['orderBy'] }
        : { orderBy?: SpotGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SpotGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSpotGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Spot model
   */
  readonly fields: SpotFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Spot.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SpotClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    garage<T extends GarageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GarageDefaultArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    floorRel<T extends Spot$floorRelArgs<ExtArgs> = {}>(args?: Subset<T, Spot$floorRelArgs<ExtArgs>>): Prisma__FloorClient<$Result.GetResult<Prisma.$FloorPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    currentVehicle<T extends Spot$currentVehicleArgs<ExtArgs> = {}>(args?: Subset<T, Spot$currentVehicleArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    sessions<T extends Spot$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, Spot$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Spot model
   */
  interface SpotFieldRefs {
    readonly id: FieldRef<"Spot", 'String'>
    readonly garageId: FieldRef<"Spot", 'String'>
    readonly floorId: FieldRef<"Spot", 'String'>
    readonly floor: FieldRef<"Spot", 'Int'>
    readonly bay: FieldRef<"Spot", 'Int'>
    readonly spotNumber: FieldRef<"Spot", 'String'>
    readonly type: FieldRef<"Spot", 'SpotType'>
    readonly status: FieldRef<"Spot", 'SpotStatus'>
    readonly features: FieldRef<"Spot", 'String'>
    readonly currentVehicleId: FieldRef<"Spot", 'String'>
    readonly createdAt: FieldRef<"Spot", 'DateTime'>
    readonly updatedAt: FieldRef<"Spot", 'DateTime'>
    readonly deletedAt: FieldRef<"Spot", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Spot findUnique
   */
  export type SpotFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * Filter, which Spot to fetch.
     */
    where: SpotWhereUniqueInput
  }

  /**
   * Spot findUniqueOrThrow
   */
  export type SpotFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * Filter, which Spot to fetch.
     */
    where: SpotWhereUniqueInput
  }

  /**
   * Spot findFirst
   */
  export type SpotFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * Filter, which Spot to fetch.
     */
    where?: SpotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Spots to fetch.
     */
    orderBy?: SpotOrderByWithRelationInput | SpotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Spots.
     */
    cursor?: SpotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Spots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Spots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Spots.
     */
    distinct?: SpotScalarFieldEnum | SpotScalarFieldEnum[]
  }

  /**
   * Spot findFirstOrThrow
   */
  export type SpotFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * Filter, which Spot to fetch.
     */
    where?: SpotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Spots to fetch.
     */
    orderBy?: SpotOrderByWithRelationInput | SpotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Spots.
     */
    cursor?: SpotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Spots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Spots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Spots.
     */
    distinct?: SpotScalarFieldEnum | SpotScalarFieldEnum[]
  }

  /**
   * Spot findMany
   */
  export type SpotFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * Filter, which Spots to fetch.
     */
    where?: SpotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Spots to fetch.
     */
    orderBy?: SpotOrderByWithRelationInput | SpotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Spots.
     */
    cursor?: SpotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Spots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Spots.
     */
    skip?: number
    distinct?: SpotScalarFieldEnum | SpotScalarFieldEnum[]
  }

  /**
   * Spot create
   */
  export type SpotCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * The data needed to create a Spot.
     */
    data: XOR<SpotCreateInput, SpotUncheckedCreateInput>
  }

  /**
   * Spot createMany
   */
  export type SpotCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Spots.
     */
    data: SpotCreateManyInput | SpotCreateManyInput[]
  }

  /**
   * Spot createManyAndReturn
   */
  export type SpotCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * The data used to create many Spots.
     */
    data: SpotCreateManyInput | SpotCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Spot update
   */
  export type SpotUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * The data needed to update a Spot.
     */
    data: XOR<SpotUpdateInput, SpotUncheckedUpdateInput>
    /**
     * Choose, which Spot to update.
     */
    where: SpotWhereUniqueInput
  }

  /**
   * Spot updateMany
   */
  export type SpotUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Spots.
     */
    data: XOR<SpotUpdateManyMutationInput, SpotUncheckedUpdateManyInput>
    /**
     * Filter which Spots to update
     */
    where?: SpotWhereInput
    /**
     * Limit how many Spots to update.
     */
    limit?: number
  }

  /**
   * Spot updateManyAndReturn
   */
  export type SpotUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * The data used to update Spots.
     */
    data: XOR<SpotUpdateManyMutationInput, SpotUncheckedUpdateManyInput>
    /**
     * Filter which Spots to update
     */
    where?: SpotWhereInput
    /**
     * Limit how many Spots to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Spot upsert
   */
  export type SpotUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * The filter to search for the Spot to update in case it exists.
     */
    where: SpotWhereUniqueInput
    /**
     * In case the Spot found by the `where` argument doesn't exist, create a new Spot with this data.
     */
    create: XOR<SpotCreateInput, SpotUncheckedCreateInput>
    /**
     * In case the Spot was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SpotUpdateInput, SpotUncheckedUpdateInput>
  }

  /**
   * Spot delete
   */
  export type SpotDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    /**
     * Filter which Spot to delete.
     */
    where: SpotWhereUniqueInput
  }

  /**
   * Spot deleteMany
   */
  export type SpotDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Spots to delete
     */
    where?: SpotWhereInput
    /**
     * Limit how many Spots to delete.
     */
    limit?: number
  }

  /**
   * Spot.floorRel
   */
  export type Spot$floorRelArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Floor
     */
    select?: FloorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Floor
     */
    omit?: FloorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FloorInclude<ExtArgs> | null
    where?: FloorWhereInput
  }

  /**
   * Spot.currentVehicle
   */
  export type Spot$currentVehicleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    where?: VehicleWhereInput
  }

  /**
   * Spot.sessions
   */
  export type Spot$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    where?: ParkingSessionWhereInput
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    cursor?: ParkingSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ParkingSessionScalarFieldEnum | ParkingSessionScalarFieldEnum[]
  }

  /**
   * Spot without action
   */
  export type SpotDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
  }


  /**
   * Model Vehicle
   */

  export type AggregateVehicle = {
    _count: VehicleCountAggregateOutputType | null
    _avg: VehicleAvgAggregateOutputType | null
    _sum: VehicleSumAggregateOutputType | null
    _min: VehicleMinAggregateOutputType | null
    _max: VehicleMaxAggregateOutputType | null
  }

  export type VehicleAvgAggregateOutputType = {
    year: number | null
  }

  export type VehicleSumAggregateOutputType = {
    year: number | null
  }

  export type VehicleMinAggregateOutputType = {
    id: string | null
    licensePlate: string | null
    vehicleType: $Enums.VehicleType | null
    make: string | null
    model: string | null
    color: string | null
    year: number | null
    ownerName: string | null
    ownerEmail: string | null
    ownerPhone: string | null
    status: $Enums.VehicleStatus | null
    currentSpotId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type VehicleMaxAggregateOutputType = {
    id: string | null
    licensePlate: string | null
    vehicleType: $Enums.VehicleType | null
    make: string | null
    model: string | null
    color: string | null
    year: number | null
    ownerName: string | null
    ownerEmail: string | null
    ownerPhone: string | null
    status: $Enums.VehicleStatus | null
    currentSpotId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type VehicleCountAggregateOutputType = {
    id: number
    licensePlate: number
    vehicleType: number
    make: number
    model: number
    color: number
    year: number
    ownerName: number
    ownerEmail: number
    ownerPhone: number
    status: number
    currentSpotId: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type VehicleAvgAggregateInputType = {
    year?: true
  }

  export type VehicleSumAggregateInputType = {
    year?: true
  }

  export type VehicleMinAggregateInputType = {
    id?: true
    licensePlate?: true
    vehicleType?: true
    make?: true
    model?: true
    color?: true
    year?: true
    ownerName?: true
    ownerEmail?: true
    ownerPhone?: true
    status?: true
    currentSpotId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type VehicleMaxAggregateInputType = {
    id?: true
    licensePlate?: true
    vehicleType?: true
    make?: true
    model?: true
    color?: true
    year?: true
    ownerName?: true
    ownerEmail?: true
    ownerPhone?: true
    status?: true
    currentSpotId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type VehicleCountAggregateInputType = {
    id?: true
    licensePlate?: true
    vehicleType?: true
    make?: true
    model?: true
    color?: true
    year?: true
    ownerName?: true
    ownerEmail?: true
    ownerPhone?: true
    status?: true
    currentSpotId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type VehicleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Vehicle to aggregate.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Vehicles
    **/
    _count?: true | VehicleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: VehicleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: VehicleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VehicleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VehicleMaxAggregateInputType
  }

  export type GetVehicleAggregateType<T extends VehicleAggregateArgs> = {
        [P in keyof T & keyof AggregateVehicle]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVehicle[P]>
      : GetScalarType<T[P], AggregateVehicle[P]>
  }




  export type VehicleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VehicleWhereInput
    orderBy?: VehicleOrderByWithAggregationInput | VehicleOrderByWithAggregationInput[]
    by: VehicleScalarFieldEnum[] | VehicleScalarFieldEnum
    having?: VehicleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VehicleCountAggregateInputType | true
    _avg?: VehicleAvgAggregateInputType
    _sum?: VehicleSumAggregateInputType
    _min?: VehicleMinAggregateInputType
    _max?: VehicleMaxAggregateInputType
  }

  export type VehicleGroupByOutputType = {
    id: string
    licensePlate: string
    vehicleType: $Enums.VehicleType
    make: string | null
    model: string | null
    color: string | null
    year: number | null
    ownerName: string | null
    ownerEmail: string | null
    ownerPhone: string | null
    status: $Enums.VehicleStatus
    currentSpotId: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: VehicleCountAggregateOutputType | null
    _avg: VehicleAvgAggregateOutputType | null
    _sum: VehicleSumAggregateOutputType | null
    _min: VehicleMinAggregateOutputType | null
    _max: VehicleMaxAggregateOutputType | null
  }

  type GetVehicleGroupByPayload<T extends VehicleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VehicleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VehicleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VehicleGroupByOutputType[P]>
            : GetScalarType<T[P], VehicleGroupByOutputType[P]>
        }
      >
    >


  export type VehicleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    licensePlate?: boolean
    vehicleType?: boolean
    make?: boolean
    model?: boolean
    color?: boolean
    year?: boolean
    ownerName?: boolean
    ownerEmail?: boolean
    ownerPhone?: boolean
    status?: boolean
    currentSpotId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    currentSpot?: boolean | Vehicle$currentSpotArgs<ExtArgs>
    sessions?: boolean | Vehicle$sessionsArgs<ExtArgs>
    tickets?: boolean | Vehicle$ticketsArgs<ExtArgs>
    payments?: boolean | Vehicle$paymentsArgs<ExtArgs>
    _count?: boolean | VehicleCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["vehicle"]>

  export type VehicleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    licensePlate?: boolean
    vehicleType?: boolean
    make?: boolean
    model?: boolean
    color?: boolean
    year?: boolean
    ownerName?: boolean
    ownerEmail?: boolean
    ownerPhone?: boolean
    status?: boolean
    currentSpotId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["vehicle"]>

  export type VehicleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    licensePlate?: boolean
    vehicleType?: boolean
    make?: boolean
    model?: boolean
    color?: boolean
    year?: boolean
    ownerName?: boolean
    ownerEmail?: boolean
    ownerPhone?: boolean
    status?: boolean
    currentSpotId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["vehicle"]>

  export type VehicleSelectScalar = {
    id?: boolean
    licensePlate?: boolean
    vehicleType?: boolean
    make?: boolean
    model?: boolean
    color?: boolean
    year?: boolean
    ownerName?: boolean
    ownerEmail?: boolean
    ownerPhone?: boolean
    status?: boolean
    currentSpotId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type VehicleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "licensePlate" | "vehicleType" | "make" | "model" | "color" | "year" | "ownerName" | "ownerEmail" | "ownerPhone" | "status" | "currentSpotId" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["vehicle"]>
  export type VehicleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    currentSpot?: boolean | Vehicle$currentSpotArgs<ExtArgs>
    sessions?: boolean | Vehicle$sessionsArgs<ExtArgs>
    tickets?: boolean | Vehicle$ticketsArgs<ExtArgs>
    payments?: boolean | Vehicle$paymentsArgs<ExtArgs>
    _count?: boolean | VehicleCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type VehicleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type VehicleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $VehiclePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Vehicle"
    objects: {
      currentSpot: Prisma.$SpotPayload<ExtArgs> | null
      sessions: Prisma.$ParkingSessionPayload<ExtArgs>[]
      tickets: Prisma.$TicketPayload<ExtArgs>[]
      payments: Prisma.$PaymentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      licensePlate: string
      vehicleType: $Enums.VehicleType
      make: string | null
      model: string | null
      color: string | null
      year: number | null
      ownerName: string | null
      ownerEmail: string | null
      ownerPhone: string | null
      status: $Enums.VehicleStatus
      currentSpotId: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["vehicle"]>
    composites: {}
  }

  type VehicleGetPayload<S extends boolean | null | undefined | VehicleDefaultArgs> = $Result.GetResult<Prisma.$VehiclePayload, S>

  type VehicleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<VehicleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: VehicleCountAggregateInputType | true
    }

  export interface VehicleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Vehicle'], meta: { name: 'Vehicle' } }
    /**
     * Find zero or one Vehicle that matches the filter.
     * @param {VehicleFindUniqueArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VehicleFindUniqueArgs>(args: SelectSubset<T, VehicleFindUniqueArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Vehicle that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {VehicleFindUniqueOrThrowArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VehicleFindUniqueOrThrowArgs>(args: SelectSubset<T, VehicleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Vehicle that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleFindFirstArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VehicleFindFirstArgs>(args?: SelectSubset<T, VehicleFindFirstArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Vehicle that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleFindFirstOrThrowArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VehicleFindFirstOrThrowArgs>(args?: SelectSubset<T, VehicleFindFirstOrThrowArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Vehicles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Vehicles
     * const vehicles = await prisma.vehicle.findMany()
     * 
     * // Get first 10 Vehicles
     * const vehicles = await prisma.vehicle.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const vehicleWithIdOnly = await prisma.vehicle.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends VehicleFindManyArgs>(args?: SelectSubset<T, VehicleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Vehicle.
     * @param {VehicleCreateArgs} args - Arguments to create a Vehicle.
     * @example
     * // Create one Vehicle
     * const Vehicle = await prisma.vehicle.create({
     *   data: {
     *     // ... data to create a Vehicle
     *   }
     * })
     * 
     */
    create<T extends VehicleCreateArgs>(args: SelectSubset<T, VehicleCreateArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Vehicles.
     * @param {VehicleCreateManyArgs} args - Arguments to create many Vehicles.
     * @example
     * // Create many Vehicles
     * const vehicle = await prisma.vehicle.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VehicleCreateManyArgs>(args?: SelectSubset<T, VehicleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Vehicles and returns the data saved in the database.
     * @param {VehicleCreateManyAndReturnArgs} args - Arguments to create many Vehicles.
     * @example
     * // Create many Vehicles
     * const vehicle = await prisma.vehicle.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Vehicles and only return the `id`
     * const vehicleWithIdOnly = await prisma.vehicle.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VehicleCreateManyAndReturnArgs>(args?: SelectSubset<T, VehicleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Vehicle.
     * @param {VehicleDeleteArgs} args - Arguments to delete one Vehicle.
     * @example
     * // Delete one Vehicle
     * const Vehicle = await prisma.vehicle.delete({
     *   where: {
     *     // ... filter to delete one Vehicle
     *   }
     * })
     * 
     */
    delete<T extends VehicleDeleteArgs>(args: SelectSubset<T, VehicleDeleteArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Vehicle.
     * @param {VehicleUpdateArgs} args - Arguments to update one Vehicle.
     * @example
     * // Update one Vehicle
     * const vehicle = await prisma.vehicle.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VehicleUpdateArgs>(args: SelectSubset<T, VehicleUpdateArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Vehicles.
     * @param {VehicleDeleteManyArgs} args - Arguments to filter Vehicles to delete.
     * @example
     * // Delete a few Vehicles
     * const { count } = await prisma.vehicle.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VehicleDeleteManyArgs>(args?: SelectSubset<T, VehicleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Vehicles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Vehicles
     * const vehicle = await prisma.vehicle.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VehicleUpdateManyArgs>(args: SelectSubset<T, VehicleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Vehicles and returns the data updated in the database.
     * @param {VehicleUpdateManyAndReturnArgs} args - Arguments to update many Vehicles.
     * @example
     * // Update many Vehicles
     * const vehicle = await prisma.vehicle.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Vehicles and only return the `id`
     * const vehicleWithIdOnly = await prisma.vehicle.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends VehicleUpdateManyAndReturnArgs>(args: SelectSubset<T, VehicleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Vehicle.
     * @param {VehicleUpsertArgs} args - Arguments to update or create a Vehicle.
     * @example
     * // Update or create a Vehicle
     * const vehicle = await prisma.vehicle.upsert({
     *   create: {
     *     // ... data to create a Vehicle
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Vehicle we want to update
     *   }
     * })
     */
    upsert<T extends VehicleUpsertArgs>(args: SelectSubset<T, VehicleUpsertArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Vehicles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleCountArgs} args - Arguments to filter Vehicles to count.
     * @example
     * // Count the number of Vehicles
     * const count = await prisma.vehicle.count({
     *   where: {
     *     // ... the filter for the Vehicles we want to count
     *   }
     * })
    **/
    count<T extends VehicleCountArgs>(
      args?: Subset<T, VehicleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VehicleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Vehicle.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VehicleAggregateArgs>(args: Subset<T, VehicleAggregateArgs>): Prisma.PrismaPromise<GetVehicleAggregateType<T>>

    /**
     * Group by Vehicle.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VehicleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VehicleGroupByArgs['orderBy'] }
        : { orderBy?: VehicleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VehicleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVehicleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Vehicle model
   */
  readonly fields: VehicleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Vehicle.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VehicleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    currentSpot<T extends Vehicle$currentSpotArgs<ExtArgs> = {}>(args?: Subset<T, Vehicle$currentSpotArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    sessions<T extends Vehicle$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, Vehicle$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tickets<T extends Vehicle$ticketsArgs<ExtArgs> = {}>(args?: Subset<T, Vehicle$ticketsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    payments<T extends Vehicle$paymentsArgs<ExtArgs> = {}>(args?: Subset<T, Vehicle$paymentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Vehicle model
   */
  interface VehicleFieldRefs {
    readonly id: FieldRef<"Vehicle", 'String'>
    readonly licensePlate: FieldRef<"Vehicle", 'String'>
    readonly vehicleType: FieldRef<"Vehicle", 'VehicleType'>
    readonly make: FieldRef<"Vehicle", 'String'>
    readonly model: FieldRef<"Vehicle", 'String'>
    readonly color: FieldRef<"Vehicle", 'String'>
    readonly year: FieldRef<"Vehicle", 'Int'>
    readonly ownerName: FieldRef<"Vehicle", 'String'>
    readonly ownerEmail: FieldRef<"Vehicle", 'String'>
    readonly ownerPhone: FieldRef<"Vehicle", 'String'>
    readonly status: FieldRef<"Vehicle", 'VehicleStatus'>
    readonly currentSpotId: FieldRef<"Vehicle", 'String'>
    readonly createdAt: FieldRef<"Vehicle", 'DateTime'>
    readonly updatedAt: FieldRef<"Vehicle", 'DateTime'>
    readonly deletedAt: FieldRef<"Vehicle", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Vehicle findUnique
   */
  export type VehicleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle findUniqueOrThrow
   */
  export type VehicleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle findFirst
   */
  export type VehicleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Vehicles.
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Vehicles.
     */
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * Vehicle findFirstOrThrow
   */
  export type VehicleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Vehicles.
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Vehicles.
     */
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * Vehicle findMany
   */
  export type VehicleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicles to fetch.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Vehicles.
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * Vehicle create
   */
  export type VehicleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * The data needed to create a Vehicle.
     */
    data: XOR<VehicleCreateInput, VehicleUncheckedCreateInput>
  }

  /**
   * Vehicle createMany
   */
  export type VehicleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Vehicles.
     */
    data: VehicleCreateManyInput | VehicleCreateManyInput[]
  }

  /**
   * Vehicle createManyAndReturn
   */
  export type VehicleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * The data used to create many Vehicles.
     */
    data: VehicleCreateManyInput | VehicleCreateManyInput[]
  }

  /**
   * Vehicle update
   */
  export type VehicleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * The data needed to update a Vehicle.
     */
    data: XOR<VehicleUpdateInput, VehicleUncheckedUpdateInput>
    /**
     * Choose, which Vehicle to update.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle updateMany
   */
  export type VehicleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Vehicles.
     */
    data: XOR<VehicleUpdateManyMutationInput, VehicleUncheckedUpdateManyInput>
    /**
     * Filter which Vehicles to update
     */
    where?: VehicleWhereInput
    /**
     * Limit how many Vehicles to update.
     */
    limit?: number
  }

  /**
   * Vehicle updateManyAndReturn
   */
  export type VehicleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * The data used to update Vehicles.
     */
    data: XOR<VehicleUpdateManyMutationInput, VehicleUncheckedUpdateManyInput>
    /**
     * Filter which Vehicles to update
     */
    where?: VehicleWhereInput
    /**
     * Limit how many Vehicles to update.
     */
    limit?: number
  }

  /**
   * Vehicle upsert
   */
  export type VehicleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * The filter to search for the Vehicle to update in case it exists.
     */
    where: VehicleWhereUniqueInput
    /**
     * In case the Vehicle found by the `where` argument doesn't exist, create a new Vehicle with this data.
     */
    create: XOR<VehicleCreateInput, VehicleUncheckedCreateInput>
    /**
     * In case the Vehicle was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VehicleUpdateInput, VehicleUncheckedUpdateInput>
  }

  /**
   * Vehicle delete
   */
  export type VehicleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter which Vehicle to delete.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle deleteMany
   */
  export type VehicleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Vehicles to delete
     */
    where?: VehicleWhereInput
    /**
     * Limit how many Vehicles to delete.
     */
    limit?: number
  }

  /**
   * Vehicle.currentSpot
   */
  export type Vehicle$currentSpotArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Spot
     */
    select?: SpotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Spot
     */
    omit?: SpotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SpotInclude<ExtArgs> | null
    where?: SpotWhereInput
  }

  /**
   * Vehicle.sessions
   */
  export type Vehicle$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    where?: ParkingSessionWhereInput
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    cursor?: ParkingSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ParkingSessionScalarFieldEnum | ParkingSessionScalarFieldEnum[]
  }

  /**
   * Vehicle.tickets
   */
  export type Vehicle$ticketsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    where?: TicketWhereInput
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    cursor?: TicketWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TicketScalarFieldEnum | TicketScalarFieldEnum[]
  }

  /**
   * Vehicle.payments
   */
  export type Vehicle$paymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    cursor?: PaymentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Vehicle without action
   */
  export type VehicleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
  }


  /**
   * Model ParkingSession
   */

  export type AggregateParkingSession = {
    _count: ParkingSessionCountAggregateOutputType | null
    _avg: ParkingSessionAvgAggregateOutputType | null
    _sum: ParkingSessionSumAggregateOutputType | null
    _min: ParkingSessionMinAggregateOutputType | null
    _max: ParkingSessionMaxAggregateOutputType | null
  }

  export type ParkingSessionAvgAggregateOutputType = {
    durationMinutes: number | null
    hourlyRate: number | null
    totalAmount: number | null
  }

  export type ParkingSessionSumAggregateOutputType = {
    durationMinutes: number | null
    hourlyRate: number | null
    totalAmount: number | null
  }

  export type ParkingSessionMinAggregateOutputType = {
    id: string | null
    garageId: string | null
    spotId: string | null
    vehicleId: string | null
    status: $Enums.SessionStatus | null
    rateType: $Enums.RateType | null
    checkInTime: Date | null
    checkOutTime: Date | null
    expectedEndTime: Date | null
    durationMinutes: number | null
    hourlyRate: number | null
    totalAmount: number | null
    isPaid: boolean | null
    notes: string | null
    metadata: string | null
    endReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type ParkingSessionMaxAggregateOutputType = {
    id: string | null
    garageId: string | null
    spotId: string | null
    vehicleId: string | null
    status: $Enums.SessionStatus | null
    rateType: $Enums.RateType | null
    checkInTime: Date | null
    checkOutTime: Date | null
    expectedEndTime: Date | null
    durationMinutes: number | null
    hourlyRate: number | null
    totalAmount: number | null
    isPaid: boolean | null
    notes: string | null
    metadata: string | null
    endReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type ParkingSessionCountAggregateOutputType = {
    id: number
    garageId: number
    spotId: number
    vehicleId: number
    status: number
    rateType: number
    checkInTime: number
    checkOutTime: number
    expectedEndTime: number
    durationMinutes: number
    hourlyRate: number
    totalAmount: number
    isPaid: number
    notes: number
    metadata: number
    endReason: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type ParkingSessionAvgAggregateInputType = {
    durationMinutes?: true
    hourlyRate?: true
    totalAmount?: true
  }

  export type ParkingSessionSumAggregateInputType = {
    durationMinutes?: true
    hourlyRate?: true
    totalAmount?: true
  }

  export type ParkingSessionMinAggregateInputType = {
    id?: true
    garageId?: true
    spotId?: true
    vehicleId?: true
    status?: true
    rateType?: true
    checkInTime?: true
    checkOutTime?: true
    expectedEndTime?: true
    durationMinutes?: true
    hourlyRate?: true
    totalAmount?: true
    isPaid?: true
    notes?: true
    metadata?: true
    endReason?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type ParkingSessionMaxAggregateInputType = {
    id?: true
    garageId?: true
    spotId?: true
    vehicleId?: true
    status?: true
    rateType?: true
    checkInTime?: true
    checkOutTime?: true
    expectedEndTime?: true
    durationMinutes?: true
    hourlyRate?: true
    totalAmount?: true
    isPaid?: true
    notes?: true
    metadata?: true
    endReason?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type ParkingSessionCountAggregateInputType = {
    id?: true
    garageId?: true
    spotId?: true
    vehicleId?: true
    status?: true
    rateType?: true
    checkInTime?: true
    checkOutTime?: true
    expectedEndTime?: true
    durationMinutes?: true
    hourlyRate?: true
    totalAmount?: true
    isPaid?: true
    notes?: true
    metadata?: true
    endReason?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type ParkingSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ParkingSession to aggregate.
     */
    where?: ParkingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParkingSessions to fetch.
     */
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ParkingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParkingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParkingSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ParkingSessions
    **/
    _count?: true | ParkingSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ParkingSessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ParkingSessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ParkingSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ParkingSessionMaxAggregateInputType
  }

  export type GetParkingSessionAggregateType<T extends ParkingSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateParkingSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateParkingSession[P]>
      : GetScalarType<T[P], AggregateParkingSession[P]>
  }




  export type ParkingSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParkingSessionWhereInput
    orderBy?: ParkingSessionOrderByWithAggregationInput | ParkingSessionOrderByWithAggregationInput[]
    by: ParkingSessionScalarFieldEnum[] | ParkingSessionScalarFieldEnum
    having?: ParkingSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ParkingSessionCountAggregateInputType | true
    _avg?: ParkingSessionAvgAggregateInputType
    _sum?: ParkingSessionSumAggregateInputType
    _min?: ParkingSessionMinAggregateInputType
    _max?: ParkingSessionMaxAggregateInputType
  }

  export type ParkingSessionGroupByOutputType = {
    id: string
    garageId: string
    spotId: string
    vehicleId: string
    status: $Enums.SessionStatus
    rateType: $Enums.RateType
    checkInTime: Date
    checkOutTime: Date | null
    expectedEndTime: Date | null
    durationMinutes: number | null
    hourlyRate: number | null
    totalAmount: number
    isPaid: boolean
    notes: string | null
    metadata: string | null
    endReason: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: ParkingSessionCountAggregateOutputType | null
    _avg: ParkingSessionAvgAggregateOutputType | null
    _sum: ParkingSessionSumAggregateOutputType | null
    _min: ParkingSessionMinAggregateOutputType | null
    _max: ParkingSessionMaxAggregateOutputType | null
  }

  type GetParkingSessionGroupByPayload<T extends ParkingSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ParkingSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ParkingSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ParkingSessionGroupByOutputType[P]>
            : GetScalarType<T[P], ParkingSessionGroupByOutputType[P]>
        }
      >
    >


  export type ParkingSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    spotId?: boolean
    vehicleId?: boolean
    status?: boolean
    rateType?: boolean
    checkInTime?: boolean
    checkOutTime?: boolean
    expectedEndTime?: boolean
    durationMinutes?: boolean
    hourlyRate?: boolean
    totalAmount?: boolean
    isPaid?: boolean
    notes?: boolean
    metadata?: boolean
    endReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spot?: boolean | SpotDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    tickets?: boolean | ParkingSession$ticketsArgs<ExtArgs>
    payments?: boolean | ParkingSession$paymentsArgs<ExtArgs>
    _count?: boolean | ParkingSessionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parkingSession"]>

  export type ParkingSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    spotId?: boolean
    vehicleId?: boolean
    status?: boolean
    rateType?: boolean
    checkInTime?: boolean
    checkOutTime?: boolean
    expectedEndTime?: boolean
    durationMinutes?: boolean
    hourlyRate?: boolean
    totalAmount?: boolean
    isPaid?: boolean
    notes?: boolean
    metadata?: boolean
    endReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spot?: boolean | SpotDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parkingSession"]>

  export type ParkingSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    spotId?: boolean
    vehicleId?: boolean
    status?: boolean
    rateType?: boolean
    checkInTime?: boolean
    checkOutTime?: boolean
    expectedEndTime?: boolean
    durationMinutes?: boolean
    hourlyRate?: boolean
    totalAmount?: boolean
    isPaid?: boolean
    notes?: boolean
    metadata?: boolean
    endReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spot?: boolean | SpotDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parkingSession"]>

  export type ParkingSessionSelectScalar = {
    id?: boolean
    garageId?: boolean
    spotId?: boolean
    vehicleId?: boolean
    status?: boolean
    rateType?: boolean
    checkInTime?: boolean
    checkOutTime?: boolean
    expectedEndTime?: boolean
    durationMinutes?: boolean
    hourlyRate?: boolean
    totalAmount?: boolean
    isPaid?: boolean
    notes?: boolean
    metadata?: boolean
    endReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type ParkingSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "garageId" | "spotId" | "vehicleId" | "status" | "rateType" | "checkInTime" | "checkOutTime" | "expectedEndTime" | "durationMinutes" | "hourlyRate" | "totalAmount" | "isPaid" | "notes" | "metadata" | "endReason" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["parkingSession"]>
  export type ParkingSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spot?: boolean | SpotDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    tickets?: boolean | ParkingSession$ticketsArgs<ExtArgs>
    payments?: boolean | ParkingSession$paymentsArgs<ExtArgs>
    _count?: boolean | ParkingSessionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ParkingSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spot?: boolean | SpotDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
  }
  export type ParkingSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    spot?: boolean | SpotDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
  }

  export type $ParkingSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ParkingSession"
    objects: {
      garage: Prisma.$GaragePayload<ExtArgs>
      spot: Prisma.$SpotPayload<ExtArgs>
      vehicle: Prisma.$VehiclePayload<ExtArgs>
      tickets: Prisma.$TicketPayload<ExtArgs>[]
      payments: Prisma.$PaymentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      garageId: string
      spotId: string
      vehicleId: string
      status: $Enums.SessionStatus
      rateType: $Enums.RateType
      checkInTime: Date
      checkOutTime: Date | null
      expectedEndTime: Date | null
      durationMinutes: number | null
      hourlyRate: number | null
      totalAmount: number
      isPaid: boolean
      notes: string | null
      metadata: string | null
      endReason: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["parkingSession"]>
    composites: {}
  }

  type ParkingSessionGetPayload<S extends boolean | null | undefined | ParkingSessionDefaultArgs> = $Result.GetResult<Prisma.$ParkingSessionPayload, S>

  type ParkingSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ParkingSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ParkingSessionCountAggregateInputType | true
    }

  export interface ParkingSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ParkingSession'], meta: { name: 'ParkingSession' } }
    /**
     * Find zero or one ParkingSession that matches the filter.
     * @param {ParkingSessionFindUniqueArgs} args - Arguments to find a ParkingSession
     * @example
     * // Get one ParkingSession
     * const parkingSession = await prisma.parkingSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ParkingSessionFindUniqueArgs>(args: SelectSubset<T, ParkingSessionFindUniqueArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ParkingSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ParkingSessionFindUniqueOrThrowArgs} args - Arguments to find a ParkingSession
     * @example
     * // Get one ParkingSession
     * const parkingSession = await prisma.parkingSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ParkingSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, ParkingSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ParkingSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionFindFirstArgs} args - Arguments to find a ParkingSession
     * @example
     * // Get one ParkingSession
     * const parkingSession = await prisma.parkingSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ParkingSessionFindFirstArgs>(args?: SelectSubset<T, ParkingSessionFindFirstArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ParkingSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionFindFirstOrThrowArgs} args - Arguments to find a ParkingSession
     * @example
     * // Get one ParkingSession
     * const parkingSession = await prisma.parkingSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ParkingSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, ParkingSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ParkingSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ParkingSessions
     * const parkingSessions = await prisma.parkingSession.findMany()
     * 
     * // Get first 10 ParkingSessions
     * const parkingSessions = await prisma.parkingSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const parkingSessionWithIdOnly = await prisma.parkingSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ParkingSessionFindManyArgs>(args?: SelectSubset<T, ParkingSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ParkingSession.
     * @param {ParkingSessionCreateArgs} args - Arguments to create a ParkingSession.
     * @example
     * // Create one ParkingSession
     * const ParkingSession = await prisma.parkingSession.create({
     *   data: {
     *     // ... data to create a ParkingSession
     *   }
     * })
     * 
     */
    create<T extends ParkingSessionCreateArgs>(args: SelectSubset<T, ParkingSessionCreateArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ParkingSessions.
     * @param {ParkingSessionCreateManyArgs} args - Arguments to create many ParkingSessions.
     * @example
     * // Create many ParkingSessions
     * const parkingSession = await prisma.parkingSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ParkingSessionCreateManyArgs>(args?: SelectSubset<T, ParkingSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ParkingSessions and returns the data saved in the database.
     * @param {ParkingSessionCreateManyAndReturnArgs} args - Arguments to create many ParkingSessions.
     * @example
     * // Create many ParkingSessions
     * const parkingSession = await prisma.parkingSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ParkingSessions and only return the `id`
     * const parkingSessionWithIdOnly = await prisma.parkingSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ParkingSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, ParkingSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ParkingSession.
     * @param {ParkingSessionDeleteArgs} args - Arguments to delete one ParkingSession.
     * @example
     * // Delete one ParkingSession
     * const ParkingSession = await prisma.parkingSession.delete({
     *   where: {
     *     // ... filter to delete one ParkingSession
     *   }
     * })
     * 
     */
    delete<T extends ParkingSessionDeleteArgs>(args: SelectSubset<T, ParkingSessionDeleteArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ParkingSession.
     * @param {ParkingSessionUpdateArgs} args - Arguments to update one ParkingSession.
     * @example
     * // Update one ParkingSession
     * const parkingSession = await prisma.parkingSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ParkingSessionUpdateArgs>(args: SelectSubset<T, ParkingSessionUpdateArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ParkingSessions.
     * @param {ParkingSessionDeleteManyArgs} args - Arguments to filter ParkingSessions to delete.
     * @example
     * // Delete a few ParkingSessions
     * const { count } = await prisma.parkingSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ParkingSessionDeleteManyArgs>(args?: SelectSubset<T, ParkingSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ParkingSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ParkingSessions
     * const parkingSession = await prisma.parkingSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ParkingSessionUpdateManyArgs>(args: SelectSubset<T, ParkingSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ParkingSessions and returns the data updated in the database.
     * @param {ParkingSessionUpdateManyAndReturnArgs} args - Arguments to update many ParkingSessions.
     * @example
     * // Update many ParkingSessions
     * const parkingSession = await prisma.parkingSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ParkingSessions and only return the `id`
     * const parkingSessionWithIdOnly = await prisma.parkingSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ParkingSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, ParkingSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ParkingSession.
     * @param {ParkingSessionUpsertArgs} args - Arguments to update or create a ParkingSession.
     * @example
     * // Update or create a ParkingSession
     * const parkingSession = await prisma.parkingSession.upsert({
     *   create: {
     *     // ... data to create a ParkingSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ParkingSession we want to update
     *   }
     * })
     */
    upsert<T extends ParkingSessionUpsertArgs>(args: SelectSubset<T, ParkingSessionUpsertArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ParkingSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionCountArgs} args - Arguments to filter ParkingSessions to count.
     * @example
     * // Count the number of ParkingSessions
     * const count = await prisma.parkingSession.count({
     *   where: {
     *     // ... the filter for the ParkingSessions we want to count
     *   }
     * })
    **/
    count<T extends ParkingSessionCountArgs>(
      args?: Subset<T, ParkingSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ParkingSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ParkingSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ParkingSessionAggregateArgs>(args: Subset<T, ParkingSessionAggregateArgs>): Prisma.PrismaPromise<GetParkingSessionAggregateType<T>>

    /**
     * Group by ParkingSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParkingSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ParkingSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ParkingSessionGroupByArgs['orderBy'] }
        : { orderBy?: ParkingSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ParkingSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetParkingSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ParkingSession model
   */
  readonly fields: ParkingSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ParkingSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ParkingSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    garage<T extends GarageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GarageDefaultArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    spot<T extends SpotDefaultArgs<ExtArgs> = {}>(args?: Subset<T, SpotDefaultArgs<ExtArgs>>): Prisma__SpotClient<$Result.GetResult<Prisma.$SpotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    vehicle<T extends VehicleDefaultArgs<ExtArgs> = {}>(args?: Subset<T, VehicleDefaultArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tickets<T extends ParkingSession$ticketsArgs<ExtArgs> = {}>(args?: Subset<T, ParkingSession$ticketsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    payments<T extends ParkingSession$paymentsArgs<ExtArgs> = {}>(args?: Subset<T, ParkingSession$paymentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ParkingSession model
   */
  interface ParkingSessionFieldRefs {
    readonly id: FieldRef<"ParkingSession", 'String'>
    readonly garageId: FieldRef<"ParkingSession", 'String'>
    readonly spotId: FieldRef<"ParkingSession", 'String'>
    readonly vehicleId: FieldRef<"ParkingSession", 'String'>
    readonly status: FieldRef<"ParkingSession", 'SessionStatus'>
    readonly rateType: FieldRef<"ParkingSession", 'RateType'>
    readonly checkInTime: FieldRef<"ParkingSession", 'DateTime'>
    readonly checkOutTime: FieldRef<"ParkingSession", 'DateTime'>
    readonly expectedEndTime: FieldRef<"ParkingSession", 'DateTime'>
    readonly durationMinutes: FieldRef<"ParkingSession", 'Int'>
    readonly hourlyRate: FieldRef<"ParkingSession", 'Float'>
    readonly totalAmount: FieldRef<"ParkingSession", 'Float'>
    readonly isPaid: FieldRef<"ParkingSession", 'Boolean'>
    readonly notes: FieldRef<"ParkingSession", 'String'>
    readonly metadata: FieldRef<"ParkingSession", 'String'>
    readonly endReason: FieldRef<"ParkingSession", 'String'>
    readonly createdAt: FieldRef<"ParkingSession", 'DateTime'>
    readonly updatedAt: FieldRef<"ParkingSession", 'DateTime'>
    readonly deletedAt: FieldRef<"ParkingSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ParkingSession findUnique
   */
  export type ParkingSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * Filter, which ParkingSession to fetch.
     */
    where: ParkingSessionWhereUniqueInput
  }

  /**
   * ParkingSession findUniqueOrThrow
   */
  export type ParkingSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * Filter, which ParkingSession to fetch.
     */
    where: ParkingSessionWhereUniqueInput
  }

  /**
   * ParkingSession findFirst
   */
  export type ParkingSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * Filter, which ParkingSession to fetch.
     */
    where?: ParkingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParkingSessions to fetch.
     */
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ParkingSessions.
     */
    cursor?: ParkingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParkingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParkingSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ParkingSessions.
     */
    distinct?: ParkingSessionScalarFieldEnum | ParkingSessionScalarFieldEnum[]
  }

  /**
   * ParkingSession findFirstOrThrow
   */
  export type ParkingSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * Filter, which ParkingSession to fetch.
     */
    where?: ParkingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParkingSessions to fetch.
     */
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ParkingSessions.
     */
    cursor?: ParkingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParkingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParkingSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ParkingSessions.
     */
    distinct?: ParkingSessionScalarFieldEnum | ParkingSessionScalarFieldEnum[]
  }

  /**
   * ParkingSession findMany
   */
  export type ParkingSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * Filter, which ParkingSessions to fetch.
     */
    where?: ParkingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParkingSessions to fetch.
     */
    orderBy?: ParkingSessionOrderByWithRelationInput | ParkingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ParkingSessions.
     */
    cursor?: ParkingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParkingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParkingSessions.
     */
    skip?: number
    distinct?: ParkingSessionScalarFieldEnum | ParkingSessionScalarFieldEnum[]
  }

  /**
   * ParkingSession create
   */
  export type ParkingSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a ParkingSession.
     */
    data: XOR<ParkingSessionCreateInput, ParkingSessionUncheckedCreateInput>
  }

  /**
   * ParkingSession createMany
   */
  export type ParkingSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ParkingSessions.
     */
    data: ParkingSessionCreateManyInput | ParkingSessionCreateManyInput[]
  }

  /**
   * ParkingSession createManyAndReturn
   */
  export type ParkingSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * The data used to create many ParkingSessions.
     */
    data: ParkingSessionCreateManyInput | ParkingSessionCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ParkingSession update
   */
  export type ParkingSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a ParkingSession.
     */
    data: XOR<ParkingSessionUpdateInput, ParkingSessionUncheckedUpdateInput>
    /**
     * Choose, which ParkingSession to update.
     */
    where: ParkingSessionWhereUniqueInput
  }

  /**
   * ParkingSession updateMany
   */
  export type ParkingSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ParkingSessions.
     */
    data: XOR<ParkingSessionUpdateManyMutationInput, ParkingSessionUncheckedUpdateManyInput>
    /**
     * Filter which ParkingSessions to update
     */
    where?: ParkingSessionWhereInput
    /**
     * Limit how many ParkingSessions to update.
     */
    limit?: number
  }

  /**
   * ParkingSession updateManyAndReturn
   */
  export type ParkingSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * The data used to update ParkingSessions.
     */
    data: XOR<ParkingSessionUpdateManyMutationInput, ParkingSessionUncheckedUpdateManyInput>
    /**
     * Filter which ParkingSessions to update
     */
    where?: ParkingSessionWhereInput
    /**
     * Limit how many ParkingSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ParkingSession upsert
   */
  export type ParkingSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the ParkingSession to update in case it exists.
     */
    where: ParkingSessionWhereUniqueInput
    /**
     * In case the ParkingSession found by the `where` argument doesn't exist, create a new ParkingSession with this data.
     */
    create: XOR<ParkingSessionCreateInput, ParkingSessionUncheckedCreateInput>
    /**
     * In case the ParkingSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ParkingSessionUpdateInput, ParkingSessionUncheckedUpdateInput>
  }

  /**
   * ParkingSession delete
   */
  export type ParkingSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    /**
     * Filter which ParkingSession to delete.
     */
    where: ParkingSessionWhereUniqueInput
  }

  /**
   * ParkingSession deleteMany
   */
  export type ParkingSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ParkingSessions to delete
     */
    where?: ParkingSessionWhereInput
    /**
     * Limit how many ParkingSessions to delete.
     */
    limit?: number
  }

  /**
   * ParkingSession.tickets
   */
  export type ParkingSession$ticketsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    where?: TicketWhereInput
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    cursor?: TicketWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TicketScalarFieldEnum | TicketScalarFieldEnum[]
  }

  /**
   * ParkingSession.payments
   */
  export type ParkingSession$paymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    cursor?: PaymentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * ParkingSession without action
   */
  export type ParkingSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
  }


  /**
   * Model Ticket
   */

  export type AggregateTicket = {
    _count: TicketCountAggregateOutputType | null
    _avg: TicketAvgAggregateOutputType | null
    _sum: TicketSumAggregateOutputType | null
    _min: TicketMinAggregateOutputType | null
    _max: TicketMaxAggregateOutputType | null
  }

  export type TicketAvgAggregateOutputType = {
    fineAmount: number | null
  }

  export type TicketSumAggregateOutputType = {
    fineAmount: number | null
  }

  export type TicketMinAggregateOutputType = {
    id: string | null
    garageId: string | null
    vehicleId: string | null
    sessionId: string | null
    ticketNumber: string | null
    type: $Enums.TicketType | null
    status: $Enums.TicketStatus | null
    description: string | null
    violationTime: Date | null
    location: string | null
    fineAmount: number | null
    isPaid: boolean | null
    paymentDueDate: Date | null
    issuedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type TicketMaxAggregateOutputType = {
    id: string | null
    garageId: string | null
    vehicleId: string | null
    sessionId: string | null
    ticketNumber: string | null
    type: $Enums.TicketType | null
    status: $Enums.TicketStatus | null
    description: string | null
    violationTime: Date | null
    location: string | null
    fineAmount: number | null
    isPaid: boolean | null
    paymentDueDate: Date | null
    issuedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type TicketCountAggregateOutputType = {
    id: number
    garageId: number
    vehicleId: number
    sessionId: number
    ticketNumber: number
    type: number
    status: number
    description: number
    violationTime: number
    location: number
    fineAmount: number
    isPaid: number
    paymentDueDate: number
    issuedBy: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type TicketAvgAggregateInputType = {
    fineAmount?: true
  }

  export type TicketSumAggregateInputType = {
    fineAmount?: true
  }

  export type TicketMinAggregateInputType = {
    id?: true
    garageId?: true
    vehicleId?: true
    sessionId?: true
    ticketNumber?: true
    type?: true
    status?: true
    description?: true
    violationTime?: true
    location?: true
    fineAmount?: true
    isPaid?: true
    paymentDueDate?: true
    issuedBy?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type TicketMaxAggregateInputType = {
    id?: true
    garageId?: true
    vehicleId?: true
    sessionId?: true
    ticketNumber?: true
    type?: true
    status?: true
    description?: true
    violationTime?: true
    location?: true
    fineAmount?: true
    isPaid?: true
    paymentDueDate?: true
    issuedBy?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type TicketCountAggregateInputType = {
    id?: true
    garageId?: true
    vehicleId?: true
    sessionId?: true
    ticketNumber?: true
    type?: true
    status?: true
    description?: true
    violationTime?: true
    location?: true
    fineAmount?: true
    isPaid?: true
    paymentDueDate?: true
    issuedBy?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type TicketAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Ticket to aggregate.
     */
    where?: TicketWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tickets to fetch.
     */
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TicketWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tickets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tickets
    **/
    _count?: true | TicketCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TicketAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TicketSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TicketMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TicketMaxAggregateInputType
  }

  export type GetTicketAggregateType<T extends TicketAggregateArgs> = {
        [P in keyof T & keyof AggregateTicket]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTicket[P]>
      : GetScalarType<T[P], AggregateTicket[P]>
  }




  export type TicketGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TicketWhereInput
    orderBy?: TicketOrderByWithAggregationInput | TicketOrderByWithAggregationInput[]
    by: TicketScalarFieldEnum[] | TicketScalarFieldEnum
    having?: TicketScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TicketCountAggregateInputType | true
    _avg?: TicketAvgAggregateInputType
    _sum?: TicketSumAggregateInputType
    _min?: TicketMinAggregateInputType
    _max?: TicketMaxAggregateInputType
  }

  export type TicketGroupByOutputType = {
    id: string
    garageId: string
    vehicleId: string
    sessionId: string | null
    ticketNumber: string
    type: $Enums.TicketType
    status: $Enums.TicketStatus
    description: string
    violationTime: Date
    location: string | null
    fineAmount: number
    isPaid: boolean
    paymentDueDate: Date | null
    issuedBy: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: TicketCountAggregateOutputType | null
    _avg: TicketAvgAggregateOutputType | null
    _sum: TicketSumAggregateOutputType | null
    _min: TicketMinAggregateOutputType | null
    _max: TicketMaxAggregateOutputType | null
  }

  type GetTicketGroupByPayload<T extends TicketGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TicketGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TicketGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TicketGroupByOutputType[P]>
            : GetScalarType<T[P], TicketGroupByOutputType[P]>
        }
      >
    >


  export type TicketSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketNumber?: boolean
    type?: boolean
    status?: boolean
    description?: boolean
    violationTime?: boolean
    location?: boolean
    fineAmount?: boolean
    isPaid?: boolean
    paymentDueDate?: boolean
    issuedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    session?: boolean | Ticket$sessionArgs<ExtArgs>
    payments?: boolean | Ticket$paymentsArgs<ExtArgs>
    _count?: boolean | TicketCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["ticket"]>

  export type TicketSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketNumber?: boolean
    type?: boolean
    status?: boolean
    description?: boolean
    violationTime?: boolean
    location?: boolean
    fineAmount?: boolean
    isPaid?: boolean
    paymentDueDate?: boolean
    issuedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    session?: boolean | Ticket$sessionArgs<ExtArgs>
  }, ExtArgs["result"]["ticket"]>

  export type TicketSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketNumber?: boolean
    type?: boolean
    status?: boolean
    description?: boolean
    violationTime?: boolean
    location?: boolean
    fineAmount?: boolean
    isPaid?: boolean
    paymentDueDate?: boolean
    issuedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    session?: boolean | Ticket$sessionArgs<ExtArgs>
  }, ExtArgs["result"]["ticket"]>

  export type TicketSelectScalar = {
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketNumber?: boolean
    type?: boolean
    status?: boolean
    description?: boolean
    violationTime?: boolean
    location?: boolean
    fineAmount?: boolean
    isPaid?: boolean
    paymentDueDate?: boolean
    issuedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type TicketOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "garageId" | "vehicleId" | "sessionId" | "ticketNumber" | "type" | "status" | "description" | "violationTime" | "location" | "fineAmount" | "isPaid" | "paymentDueDate" | "issuedBy" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["ticket"]>
  export type TicketInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    session?: boolean | Ticket$sessionArgs<ExtArgs>
    payments?: boolean | Ticket$paymentsArgs<ExtArgs>
    _count?: boolean | TicketCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TicketIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    session?: boolean | Ticket$sessionArgs<ExtArgs>
  }
  export type TicketIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | VehicleDefaultArgs<ExtArgs>
    session?: boolean | Ticket$sessionArgs<ExtArgs>
  }

  export type $TicketPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Ticket"
    objects: {
      garage: Prisma.$GaragePayload<ExtArgs>
      vehicle: Prisma.$VehiclePayload<ExtArgs>
      session: Prisma.$ParkingSessionPayload<ExtArgs> | null
      payments: Prisma.$PaymentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      garageId: string
      vehicleId: string
      sessionId: string | null
      ticketNumber: string
      type: $Enums.TicketType
      status: $Enums.TicketStatus
      description: string
      violationTime: Date
      location: string | null
      fineAmount: number
      isPaid: boolean
      paymentDueDate: Date | null
      issuedBy: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["ticket"]>
    composites: {}
  }

  type TicketGetPayload<S extends boolean | null | undefined | TicketDefaultArgs> = $Result.GetResult<Prisma.$TicketPayload, S>

  type TicketCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TicketFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TicketCountAggregateInputType | true
    }

  export interface TicketDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Ticket'], meta: { name: 'Ticket' } }
    /**
     * Find zero or one Ticket that matches the filter.
     * @param {TicketFindUniqueArgs} args - Arguments to find a Ticket
     * @example
     * // Get one Ticket
     * const ticket = await prisma.ticket.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TicketFindUniqueArgs>(args: SelectSubset<T, TicketFindUniqueArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Ticket that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TicketFindUniqueOrThrowArgs} args - Arguments to find a Ticket
     * @example
     * // Get one Ticket
     * const ticket = await prisma.ticket.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TicketFindUniqueOrThrowArgs>(args: SelectSubset<T, TicketFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Ticket that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketFindFirstArgs} args - Arguments to find a Ticket
     * @example
     * // Get one Ticket
     * const ticket = await prisma.ticket.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TicketFindFirstArgs>(args?: SelectSubset<T, TicketFindFirstArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Ticket that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketFindFirstOrThrowArgs} args - Arguments to find a Ticket
     * @example
     * // Get one Ticket
     * const ticket = await prisma.ticket.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TicketFindFirstOrThrowArgs>(args?: SelectSubset<T, TicketFindFirstOrThrowArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tickets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tickets
     * const tickets = await prisma.ticket.findMany()
     * 
     * // Get first 10 Tickets
     * const tickets = await prisma.ticket.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ticketWithIdOnly = await prisma.ticket.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TicketFindManyArgs>(args?: SelectSubset<T, TicketFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Ticket.
     * @param {TicketCreateArgs} args - Arguments to create a Ticket.
     * @example
     * // Create one Ticket
     * const Ticket = await prisma.ticket.create({
     *   data: {
     *     // ... data to create a Ticket
     *   }
     * })
     * 
     */
    create<T extends TicketCreateArgs>(args: SelectSubset<T, TicketCreateArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tickets.
     * @param {TicketCreateManyArgs} args - Arguments to create many Tickets.
     * @example
     * // Create many Tickets
     * const ticket = await prisma.ticket.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TicketCreateManyArgs>(args?: SelectSubset<T, TicketCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tickets and returns the data saved in the database.
     * @param {TicketCreateManyAndReturnArgs} args - Arguments to create many Tickets.
     * @example
     * // Create many Tickets
     * const ticket = await prisma.ticket.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tickets and only return the `id`
     * const ticketWithIdOnly = await prisma.ticket.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TicketCreateManyAndReturnArgs>(args?: SelectSubset<T, TicketCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Ticket.
     * @param {TicketDeleteArgs} args - Arguments to delete one Ticket.
     * @example
     * // Delete one Ticket
     * const Ticket = await prisma.ticket.delete({
     *   where: {
     *     // ... filter to delete one Ticket
     *   }
     * })
     * 
     */
    delete<T extends TicketDeleteArgs>(args: SelectSubset<T, TicketDeleteArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Ticket.
     * @param {TicketUpdateArgs} args - Arguments to update one Ticket.
     * @example
     * // Update one Ticket
     * const ticket = await prisma.ticket.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TicketUpdateArgs>(args: SelectSubset<T, TicketUpdateArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tickets.
     * @param {TicketDeleteManyArgs} args - Arguments to filter Tickets to delete.
     * @example
     * // Delete a few Tickets
     * const { count } = await prisma.ticket.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TicketDeleteManyArgs>(args?: SelectSubset<T, TicketDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tickets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tickets
     * const ticket = await prisma.ticket.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TicketUpdateManyArgs>(args: SelectSubset<T, TicketUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tickets and returns the data updated in the database.
     * @param {TicketUpdateManyAndReturnArgs} args - Arguments to update many Tickets.
     * @example
     * // Update many Tickets
     * const ticket = await prisma.ticket.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tickets and only return the `id`
     * const ticketWithIdOnly = await prisma.ticket.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TicketUpdateManyAndReturnArgs>(args: SelectSubset<T, TicketUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Ticket.
     * @param {TicketUpsertArgs} args - Arguments to update or create a Ticket.
     * @example
     * // Update or create a Ticket
     * const ticket = await prisma.ticket.upsert({
     *   create: {
     *     // ... data to create a Ticket
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Ticket we want to update
     *   }
     * })
     */
    upsert<T extends TicketUpsertArgs>(args: SelectSubset<T, TicketUpsertArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tickets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketCountArgs} args - Arguments to filter Tickets to count.
     * @example
     * // Count the number of Tickets
     * const count = await prisma.ticket.count({
     *   where: {
     *     // ... the filter for the Tickets we want to count
     *   }
     * })
    **/
    count<T extends TicketCountArgs>(
      args?: Subset<T, TicketCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TicketCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Ticket.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TicketAggregateArgs>(args: Subset<T, TicketAggregateArgs>): Prisma.PrismaPromise<GetTicketAggregateType<T>>

    /**
     * Group by Ticket.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TicketGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TicketGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TicketGroupByArgs['orderBy'] }
        : { orderBy?: TicketGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TicketGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTicketGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Ticket model
   */
  readonly fields: TicketFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Ticket.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TicketClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    garage<T extends GarageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GarageDefaultArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    vehicle<T extends VehicleDefaultArgs<ExtArgs> = {}>(args?: Subset<T, VehicleDefaultArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    session<T extends Ticket$sessionArgs<ExtArgs> = {}>(args?: Subset<T, Ticket$sessionArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    payments<T extends Ticket$paymentsArgs<ExtArgs> = {}>(args?: Subset<T, Ticket$paymentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Ticket model
   */
  interface TicketFieldRefs {
    readonly id: FieldRef<"Ticket", 'String'>
    readonly garageId: FieldRef<"Ticket", 'String'>
    readonly vehicleId: FieldRef<"Ticket", 'String'>
    readonly sessionId: FieldRef<"Ticket", 'String'>
    readonly ticketNumber: FieldRef<"Ticket", 'String'>
    readonly type: FieldRef<"Ticket", 'TicketType'>
    readonly status: FieldRef<"Ticket", 'TicketStatus'>
    readonly description: FieldRef<"Ticket", 'String'>
    readonly violationTime: FieldRef<"Ticket", 'DateTime'>
    readonly location: FieldRef<"Ticket", 'String'>
    readonly fineAmount: FieldRef<"Ticket", 'Float'>
    readonly isPaid: FieldRef<"Ticket", 'Boolean'>
    readonly paymentDueDate: FieldRef<"Ticket", 'DateTime'>
    readonly issuedBy: FieldRef<"Ticket", 'String'>
    readonly createdAt: FieldRef<"Ticket", 'DateTime'>
    readonly updatedAt: FieldRef<"Ticket", 'DateTime'>
    readonly deletedAt: FieldRef<"Ticket", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Ticket findUnique
   */
  export type TicketFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * Filter, which Ticket to fetch.
     */
    where: TicketWhereUniqueInput
  }

  /**
   * Ticket findUniqueOrThrow
   */
  export type TicketFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * Filter, which Ticket to fetch.
     */
    where: TicketWhereUniqueInput
  }

  /**
   * Ticket findFirst
   */
  export type TicketFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * Filter, which Ticket to fetch.
     */
    where?: TicketWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tickets to fetch.
     */
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tickets.
     */
    cursor?: TicketWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tickets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tickets.
     */
    distinct?: TicketScalarFieldEnum | TicketScalarFieldEnum[]
  }

  /**
   * Ticket findFirstOrThrow
   */
  export type TicketFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * Filter, which Ticket to fetch.
     */
    where?: TicketWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tickets to fetch.
     */
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tickets.
     */
    cursor?: TicketWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tickets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tickets.
     */
    distinct?: TicketScalarFieldEnum | TicketScalarFieldEnum[]
  }

  /**
   * Ticket findMany
   */
  export type TicketFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * Filter, which Tickets to fetch.
     */
    where?: TicketWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tickets to fetch.
     */
    orderBy?: TicketOrderByWithRelationInput | TicketOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tickets.
     */
    cursor?: TicketWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tickets.
     */
    skip?: number
    distinct?: TicketScalarFieldEnum | TicketScalarFieldEnum[]
  }

  /**
   * Ticket create
   */
  export type TicketCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * The data needed to create a Ticket.
     */
    data: XOR<TicketCreateInput, TicketUncheckedCreateInput>
  }

  /**
   * Ticket createMany
   */
  export type TicketCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tickets.
     */
    data: TicketCreateManyInput | TicketCreateManyInput[]
  }

  /**
   * Ticket createManyAndReturn
   */
  export type TicketCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * The data used to create many Tickets.
     */
    data: TicketCreateManyInput | TicketCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Ticket update
   */
  export type TicketUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * The data needed to update a Ticket.
     */
    data: XOR<TicketUpdateInput, TicketUncheckedUpdateInput>
    /**
     * Choose, which Ticket to update.
     */
    where: TicketWhereUniqueInput
  }

  /**
   * Ticket updateMany
   */
  export type TicketUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tickets.
     */
    data: XOR<TicketUpdateManyMutationInput, TicketUncheckedUpdateManyInput>
    /**
     * Filter which Tickets to update
     */
    where?: TicketWhereInput
    /**
     * Limit how many Tickets to update.
     */
    limit?: number
  }

  /**
   * Ticket updateManyAndReturn
   */
  export type TicketUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * The data used to update Tickets.
     */
    data: XOR<TicketUpdateManyMutationInput, TicketUncheckedUpdateManyInput>
    /**
     * Filter which Tickets to update
     */
    where?: TicketWhereInput
    /**
     * Limit how many Tickets to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Ticket upsert
   */
  export type TicketUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * The filter to search for the Ticket to update in case it exists.
     */
    where: TicketWhereUniqueInput
    /**
     * In case the Ticket found by the `where` argument doesn't exist, create a new Ticket with this data.
     */
    create: XOR<TicketCreateInput, TicketUncheckedCreateInput>
    /**
     * In case the Ticket was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TicketUpdateInput, TicketUncheckedUpdateInput>
  }

  /**
   * Ticket delete
   */
  export type TicketDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    /**
     * Filter which Ticket to delete.
     */
    where: TicketWhereUniqueInput
  }

  /**
   * Ticket deleteMany
   */
  export type TicketDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tickets to delete
     */
    where?: TicketWhereInput
    /**
     * Limit how many Tickets to delete.
     */
    limit?: number
  }

  /**
   * Ticket.session
   */
  export type Ticket$sessionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    where?: ParkingSessionWhereInput
  }

  /**
   * Ticket.payments
   */
  export type Ticket$paymentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    cursor?: PaymentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Ticket without action
   */
  export type TicketDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
  }


  /**
   * Model Payment
   */

  export type AggregatePayment = {
    _count: PaymentCountAggregateOutputType | null
    _avg: PaymentAvgAggregateOutputType | null
    _sum: PaymentSumAggregateOutputType | null
    _min: PaymentMinAggregateOutputType | null
    _max: PaymentMaxAggregateOutputType | null
  }

  export type PaymentAvgAggregateOutputType = {
    amount: number | null
    refundAmount: number | null
  }

  export type PaymentSumAggregateOutputType = {
    amount: number | null
    refundAmount: number | null
  }

  export type PaymentMinAggregateOutputType = {
    id: string | null
    garageId: string | null
    vehicleId: string | null
    sessionId: string | null
    ticketId: string | null
    paymentNumber: string | null
    type: $Enums.PaymentType | null
    method: $Enums.PaymentMethod | null
    status: $Enums.PaymentStatus | null
    amount: number | null
    currency: string | null
    transactionId: string | null
    gatewayResponse: string | null
    paymentDate: Date | null
    processedAt: Date | null
    refundAmount: number | null
    refundDate: Date | null
    refundReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type PaymentMaxAggregateOutputType = {
    id: string | null
    garageId: string | null
    vehicleId: string | null
    sessionId: string | null
    ticketId: string | null
    paymentNumber: string | null
    type: $Enums.PaymentType | null
    method: $Enums.PaymentMethod | null
    status: $Enums.PaymentStatus | null
    amount: number | null
    currency: string | null
    transactionId: string | null
    gatewayResponse: string | null
    paymentDate: Date | null
    processedAt: Date | null
    refundAmount: number | null
    refundDate: Date | null
    refundReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type PaymentCountAggregateOutputType = {
    id: number
    garageId: number
    vehicleId: number
    sessionId: number
    ticketId: number
    paymentNumber: number
    type: number
    method: number
    status: number
    amount: number
    currency: number
    transactionId: number
    gatewayResponse: number
    paymentDate: number
    processedAt: number
    refundAmount: number
    refundDate: number
    refundReason: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type PaymentAvgAggregateInputType = {
    amount?: true
    refundAmount?: true
  }

  export type PaymentSumAggregateInputType = {
    amount?: true
    refundAmount?: true
  }

  export type PaymentMinAggregateInputType = {
    id?: true
    garageId?: true
    vehicleId?: true
    sessionId?: true
    ticketId?: true
    paymentNumber?: true
    type?: true
    method?: true
    status?: true
    amount?: true
    currency?: true
    transactionId?: true
    gatewayResponse?: true
    paymentDate?: true
    processedAt?: true
    refundAmount?: true
    refundDate?: true
    refundReason?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type PaymentMaxAggregateInputType = {
    id?: true
    garageId?: true
    vehicleId?: true
    sessionId?: true
    ticketId?: true
    paymentNumber?: true
    type?: true
    method?: true
    status?: true
    amount?: true
    currency?: true
    transactionId?: true
    gatewayResponse?: true
    paymentDate?: true
    processedAt?: true
    refundAmount?: true
    refundDate?: true
    refundReason?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type PaymentCountAggregateInputType = {
    id?: true
    garageId?: true
    vehicleId?: true
    sessionId?: true
    ticketId?: true
    paymentNumber?: true
    type?: true
    method?: true
    status?: true
    amount?: true
    currency?: true
    transactionId?: true
    gatewayResponse?: true
    paymentDate?: true
    processedAt?: true
    refundAmount?: true
    refundDate?: true
    refundReason?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type PaymentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Payment to aggregate.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Payments
    **/
    _count?: true | PaymentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PaymentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PaymentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PaymentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PaymentMaxAggregateInputType
  }

  export type GetPaymentAggregateType<T extends PaymentAggregateArgs> = {
        [P in keyof T & keyof AggregatePayment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePayment[P]>
      : GetScalarType<T[P], AggregatePayment[P]>
  }




  export type PaymentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentWhereInput
    orderBy?: PaymentOrderByWithAggregationInput | PaymentOrderByWithAggregationInput[]
    by: PaymentScalarFieldEnum[] | PaymentScalarFieldEnum
    having?: PaymentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PaymentCountAggregateInputType | true
    _avg?: PaymentAvgAggregateInputType
    _sum?: PaymentSumAggregateInputType
    _min?: PaymentMinAggregateInputType
    _max?: PaymentMaxAggregateInputType
  }

  export type PaymentGroupByOutputType = {
    id: string
    garageId: string
    vehicleId: string | null
    sessionId: string | null
    ticketId: string | null
    paymentNumber: string
    type: $Enums.PaymentType
    method: $Enums.PaymentMethod
    status: $Enums.PaymentStatus
    amount: number
    currency: string
    transactionId: string | null
    gatewayResponse: string | null
    paymentDate: Date
    processedAt: Date | null
    refundAmount: number
    refundDate: Date | null
    refundReason: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: PaymentCountAggregateOutputType | null
    _avg: PaymentAvgAggregateOutputType | null
    _sum: PaymentSumAggregateOutputType | null
    _min: PaymentMinAggregateOutputType | null
    _max: PaymentMaxAggregateOutputType | null
  }

  type GetPaymentGroupByPayload<T extends PaymentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PaymentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PaymentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PaymentGroupByOutputType[P]>
            : GetScalarType<T[P], PaymentGroupByOutputType[P]>
        }
      >
    >


  export type PaymentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketId?: boolean
    paymentNumber?: boolean
    type?: boolean
    method?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    transactionId?: boolean
    gatewayResponse?: boolean
    paymentDate?: boolean
    processedAt?: boolean
    refundAmount?: boolean
    refundDate?: boolean
    refundReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | Payment$vehicleArgs<ExtArgs>
    session?: boolean | Payment$sessionArgs<ExtArgs>
    ticket?: boolean | Payment$ticketArgs<ExtArgs>
  }, ExtArgs["result"]["payment"]>

  export type PaymentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketId?: boolean
    paymentNumber?: boolean
    type?: boolean
    method?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    transactionId?: boolean
    gatewayResponse?: boolean
    paymentDate?: boolean
    processedAt?: boolean
    refundAmount?: boolean
    refundDate?: boolean
    refundReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | Payment$vehicleArgs<ExtArgs>
    session?: boolean | Payment$sessionArgs<ExtArgs>
    ticket?: boolean | Payment$ticketArgs<ExtArgs>
  }, ExtArgs["result"]["payment"]>

  export type PaymentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketId?: boolean
    paymentNumber?: boolean
    type?: boolean
    method?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    transactionId?: boolean
    gatewayResponse?: boolean
    paymentDate?: boolean
    processedAt?: boolean
    refundAmount?: boolean
    refundDate?: boolean
    refundReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | Payment$vehicleArgs<ExtArgs>
    session?: boolean | Payment$sessionArgs<ExtArgs>
    ticket?: boolean | Payment$ticketArgs<ExtArgs>
  }, ExtArgs["result"]["payment"]>

  export type PaymentSelectScalar = {
    id?: boolean
    garageId?: boolean
    vehicleId?: boolean
    sessionId?: boolean
    ticketId?: boolean
    paymentNumber?: boolean
    type?: boolean
    method?: boolean
    status?: boolean
    amount?: boolean
    currency?: boolean
    transactionId?: boolean
    gatewayResponse?: boolean
    paymentDate?: boolean
    processedAt?: boolean
    refundAmount?: boolean
    refundDate?: boolean
    refundReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type PaymentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "garageId" | "vehicleId" | "sessionId" | "ticketId" | "paymentNumber" | "type" | "method" | "status" | "amount" | "currency" | "transactionId" | "gatewayResponse" | "paymentDate" | "processedAt" | "refundAmount" | "refundDate" | "refundReason" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["payment"]>
  export type PaymentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | Payment$vehicleArgs<ExtArgs>
    session?: boolean | Payment$sessionArgs<ExtArgs>
    ticket?: boolean | Payment$ticketArgs<ExtArgs>
  }
  export type PaymentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | Payment$vehicleArgs<ExtArgs>
    session?: boolean | Payment$sessionArgs<ExtArgs>
    ticket?: boolean | Payment$ticketArgs<ExtArgs>
  }
  export type PaymentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    garage?: boolean | GarageDefaultArgs<ExtArgs>
    vehicle?: boolean | Payment$vehicleArgs<ExtArgs>
    session?: boolean | Payment$sessionArgs<ExtArgs>
    ticket?: boolean | Payment$ticketArgs<ExtArgs>
  }

  export type $PaymentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Payment"
    objects: {
      garage: Prisma.$GaragePayload<ExtArgs>
      vehicle: Prisma.$VehiclePayload<ExtArgs> | null
      session: Prisma.$ParkingSessionPayload<ExtArgs> | null
      ticket: Prisma.$TicketPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      garageId: string
      vehicleId: string | null
      sessionId: string | null
      ticketId: string | null
      paymentNumber: string
      type: $Enums.PaymentType
      method: $Enums.PaymentMethod
      status: $Enums.PaymentStatus
      amount: number
      currency: string
      transactionId: string | null
      gatewayResponse: string | null
      paymentDate: Date
      processedAt: Date | null
      refundAmount: number
      refundDate: Date | null
      refundReason: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["payment"]>
    composites: {}
  }

  type PaymentGetPayload<S extends boolean | null | undefined | PaymentDefaultArgs> = $Result.GetResult<Prisma.$PaymentPayload, S>

  type PaymentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PaymentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PaymentCountAggregateInputType | true
    }

  export interface PaymentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Payment'], meta: { name: 'Payment' } }
    /**
     * Find zero or one Payment that matches the filter.
     * @param {PaymentFindUniqueArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PaymentFindUniqueArgs>(args: SelectSubset<T, PaymentFindUniqueArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Payment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PaymentFindUniqueOrThrowArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PaymentFindUniqueOrThrowArgs>(args: SelectSubset<T, PaymentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Payment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentFindFirstArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PaymentFindFirstArgs>(args?: SelectSubset<T, PaymentFindFirstArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Payment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentFindFirstOrThrowArgs} args - Arguments to find a Payment
     * @example
     * // Get one Payment
     * const payment = await prisma.payment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PaymentFindFirstOrThrowArgs>(args?: SelectSubset<T, PaymentFindFirstOrThrowArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Payments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Payments
     * const payments = await prisma.payment.findMany()
     * 
     * // Get first 10 Payments
     * const payments = await prisma.payment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const paymentWithIdOnly = await prisma.payment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PaymentFindManyArgs>(args?: SelectSubset<T, PaymentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Payment.
     * @param {PaymentCreateArgs} args - Arguments to create a Payment.
     * @example
     * // Create one Payment
     * const Payment = await prisma.payment.create({
     *   data: {
     *     // ... data to create a Payment
     *   }
     * })
     * 
     */
    create<T extends PaymentCreateArgs>(args: SelectSubset<T, PaymentCreateArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Payments.
     * @param {PaymentCreateManyArgs} args - Arguments to create many Payments.
     * @example
     * // Create many Payments
     * const payment = await prisma.payment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PaymentCreateManyArgs>(args?: SelectSubset<T, PaymentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Payments and returns the data saved in the database.
     * @param {PaymentCreateManyAndReturnArgs} args - Arguments to create many Payments.
     * @example
     * // Create many Payments
     * const payment = await prisma.payment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Payments and only return the `id`
     * const paymentWithIdOnly = await prisma.payment.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PaymentCreateManyAndReturnArgs>(args?: SelectSubset<T, PaymentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Payment.
     * @param {PaymentDeleteArgs} args - Arguments to delete one Payment.
     * @example
     * // Delete one Payment
     * const Payment = await prisma.payment.delete({
     *   where: {
     *     // ... filter to delete one Payment
     *   }
     * })
     * 
     */
    delete<T extends PaymentDeleteArgs>(args: SelectSubset<T, PaymentDeleteArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Payment.
     * @param {PaymentUpdateArgs} args - Arguments to update one Payment.
     * @example
     * // Update one Payment
     * const payment = await prisma.payment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PaymentUpdateArgs>(args: SelectSubset<T, PaymentUpdateArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Payments.
     * @param {PaymentDeleteManyArgs} args - Arguments to filter Payments to delete.
     * @example
     * // Delete a few Payments
     * const { count } = await prisma.payment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PaymentDeleteManyArgs>(args?: SelectSubset<T, PaymentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Payments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Payments
     * const payment = await prisma.payment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PaymentUpdateManyArgs>(args: SelectSubset<T, PaymentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Payments and returns the data updated in the database.
     * @param {PaymentUpdateManyAndReturnArgs} args - Arguments to update many Payments.
     * @example
     * // Update many Payments
     * const payment = await prisma.payment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Payments and only return the `id`
     * const paymentWithIdOnly = await prisma.payment.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PaymentUpdateManyAndReturnArgs>(args: SelectSubset<T, PaymentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Payment.
     * @param {PaymentUpsertArgs} args - Arguments to update or create a Payment.
     * @example
     * // Update or create a Payment
     * const payment = await prisma.payment.upsert({
     *   create: {
     *     // ... data to create a Payment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Payment we want to update
     *   }
     * })
     */
    upsert<T extends PaymentUpsertArgs>(args: SelectSubset<T, PaymentUpsertArgs<ExtArgs>>): Prisma__PaymentClient<$Result.GetResult<Prisma.$PaymentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Payments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentCountArgs} args - Arguments to filter Payments to count.
     * @example
     * // Count the number of Payments
     * const count = await prisma.payment.count({
     *   where: {
     *     // ... the filter for the Payments we want to count
     *   }
     * })
    **/
    count<T extends PaymentCountArgs>(
      args?: Subset<T, PaymentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PaymentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Payment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PaymentAggregateArgs>(args: Subset<T, PaymentAggregateArgs>): Prisma.PrismaPromise<GetPaymentAggregateType<T>>

    /**
     * Group by Payment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PaymentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PaymentGroupByArgs['orderBy'] }
        : { orderBy?: PaymentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PaymentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPaymentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Payment model
   */
  readonly fields: PaymentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Payment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PaymentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    garage<T extends GarageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GarageDefaultArgs<ExtArgs>>): Prisma__GarageClient<$Result.GetResult<Prisma.$GaragePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    vehicle<T extends Payment$vehicleArgs<ExtArgs> = {}>(args?: Subset<T, Payment$vehicleArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    session<T extends Payment$sessionArgs<ExtArgs> = {}>(args?: Subset<T, Payment$sessionArgs<ExtArgs>>): Prisma__ParkingSessionClient<$Result.GetResult<Prisma.$ParkingSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    ticket<T extends Payment$ticketArgs<ExtArgs> = {}>(args?: Subset<T, Payment$ticketArgs<ExtArgs>>): Prisma__TicketClient<$Result.GetResult<Prisma.$TicketPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Payment model
   */
  interface PaymentFieldRefs {
    readonly id: FieldRef<"Payment", 'String'>
    readonly garageId: FieldRef<"Payment", 'String'>
    readonly vehicleId: FieldRef<"Payment", 'String'>
    readonly sessionId: FieldRef<"Payment", 'String'>
    readonly ticketId: FieldRef<"Payment", 'String'>
    readonly paymentNumber: FieldRef<"Payment", 'String'>
    readonly type: FieldRef<"Payment", 'PaymentType'>
    readonly method: FieldRef<"Payment", 'PaymentMethod'>
    readonly status: FieldRef<"Payment", 'PaymentStatus'>
    readonly amount: FieldRef<"Payment", 'Float'>
    readonly currency: FieldRef<"Payment", 'String'>
    readonly transactionId: FieldRef<"Payment", 'String'>
    readonly gatewayResponse: FieldRef<"Payment", 'String'>
    readonly paymentDate: FieldRef<"Payment", 'DateTime'>
    readonly processedAt: FieldRef<"Payment", 'DateTime'>
    readonly refundAmount: FieldRef<"Payment", 'Float'>
    readonly refundDate: FieldRef<"Payment", 'DateTime'>
    readonly refundReason: FieldRef<"Payment", 'String'>
    readonly createdAt: FieldRef<"Payment", 'DateTime'>
    readonly updatedAt: FieldRef<"Payment", 'DateTime'>
    readonly deletedAt: FieldRef<"Payment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Payment findUnique
   */
  export type PaymentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment findUniqueOrThrow
   */
  export type PaymentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment findFirst
   */
  export type PaymentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Payments.
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Payments.
     */
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Payment findFirstOrThrow
   */
  export type PaymentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payment to fetch.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Payments.
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Payments.
     */
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Payment findMany
   */
  export type PaymentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter, which Payments to fetch.
     */
    where?: PaymentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Payments to fetch.
     */
    orderBy?: PaymentOrderByWithRelationInput | PaymentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Payments.
     */
    cursor?: PaymentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Payments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Payments.
     */
    skip?: number
    distinct?: PaymentScalarFieldEnum | PaymentScalarFieldEnum[]
  }

  /**
   * Payment create
   */
  export type PaymentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * The data needed to create a Payment.
     */
    data: XOR<PaymentCreateInput, PaymentUncheckedCreateInput>
  }

  /**
   * Payment createMany
   */
  export type PaymentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Payments.
     */
    data: PaymentCreateManyInput | PaymentCreateManyInput[]
  }

  /**
   * Payment createManyAndReturn
   */
  export type PaymentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * The data used to create many Payments.
     */
    data: PaymentCreateManyInput | PaymentCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Payment update
   */
  export type PaymentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * The data needed to update a Payment.
     */
    data: XOR<PaymentUpdateInput, PaymentUncheckedUpdateInput>
    /**
     * Choose, which Payment to update.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment updateMany
   */
  export type PaymentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Payments.
     */
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyInput>
    /**
     * Filter which Payments to update
     */
    where?: PaymentWhereInput
    /**
     * Limit how many Payments to update.
     */
    limit?: number
  }

  /**
   * Payment updateManyAndReturn
   */
  export type PaymentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * The data used to update Payments.
     */
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyInput>
    /**
     * Filter which Payments to update
     */
    where?: PaymentWhereInput
    /**
     * Limit how many Payments to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Payment upsert
   */
  export type PaymentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * The filter to search for the Payment to update in case it exists.
     */
    where: PaymentWhereUniqueInput
    /**
     * In case the Payment found by the `where` argument doesn't exist, create a new Payment with this data.
     */
    create: XOR<PaymentCreateInput, PaymentUncheckedCreateInput>
    /**
     * In case the Payment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PaymentUpdateInput, PaymentUncheckedUpdateInput>
  }

  /**
   * Payment delete
   */
  export type PaymentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
    /**
     * Filter which Payment to delete.
     */
    where: PaymentWhereUniqueInput
  }

  /**
   * Payment deleteMany
   */
  export type PaymentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Payments to delete
     */
    where?: PaymentWhereInput
    /**
     * Limit how many Payments to delete.
     */
    limit?: number
  }

  /**
   * Payment.vehicle
   */
  export type Payment$vehicleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Vehicle
     */
    omit?: VehicleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    where?: VehicleWhereInput
  }

  /**
   * Payment.session
   */
  export type Payment$sessionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParkingSession
     */
    select?: ParkingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParkingSession
     */
    omit?: ParkingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParkingSessionInclude<ExtArgs> | null
    where?: ParkingSessionWhereInput
  }

  /**
   * Payment.ticket
   */
  export type Payment$ticketArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Ticket
     */
    select?: TicketSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Ticket
     */
    omit?: TicketOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TicketInclude<ExtArgs> | null
    where?: TicketWhereInput
  }

  /**
   * Payment without action
   */
  export type PaymentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Payment
     */
    select?: PaymentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Payment
     */
    omit?: PaymentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const GarageScalarFieldEnum: {
    id: 'id',
    name: 'name',
    description: 'description',
    totalFloors: 'totalFloors',
    totalSpots: 'totalSpots',
    isActive: 'isActive',
    operatingHours: 'operatingHours',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type GarageScalarFieldEnum = (typeof GarageScalarFieldEnum)[keyof typeof GarageScalarFieldEnum]


  export const FloorScalarFieldEnum: {
    id: 'id',
    garageId: 'garageId',
    number: 'number',
    name: 'name',
    bays: 'bays',
    spotsPerBay: 'spotsPerBay',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type FloorScalarFieldEnum = (typeof FloorScalarFieldEnum)[keyof typeof FloorScalarFieldEnum]


  export const SpotScalarFieldEnum: {
    id: 'id',
    garageId: 'garageId',
    floorId: 'floorId',
    floor: 'floor',
    bay: 'bay',
    spotNumber: 'spotNumber',
    type: 'type',
    status: 'status',
    features: 'features',
    currentVehicleId: 'currentVehicleId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type SpotScalarFieldEnum = (typeof SpotScalarFieldEnum)[keyof typeof SpotScalarFieldEnum]


  export const VehicleScalarFieldEnum: {
    id: 'id',
    licensePlate: 'licensePlate',
    vehicleType: 'vehicleType',
    make: 'make',
    model: 'model',
    color: 'color',
    year: 'year',
    ownerName: 'ownerName',
    ownerEmail: 'ownerEmail',
    ownerPhone: 'ownerPhone',
    status: 'status',
    currentSpotId: 'currentSpotId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type VehicleScalarFieldEnum = (typeof VehicleScalarFieldEnum)[keyof typeof VehicleScalarFieldEnum]


  export const ParkingSessionScalarFieldEnum: {
    id: 'id',
    garageId: 'garageId',
    spotId: 'spotId',
    vehicleId: 'vehicleId',
    status: 'status',
    rateType: 'rateType',
    checkInTime: 'checkInTime',
    checkOutTime: 'checkOutTime',
    expectedEndTime: 'expectedEndTime',
    durationMinutes: 'durationMinutes',
    hourlyRate: 'hourlyRate',
    totalAmount: 'totalAmount',
    isPaid: 'isPaid',
    notes: 'notes',
    metadata: 'metadata',
    endReason: 'endReason',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type ParkingSessionScalarFieldEnum = (typeof ParkingSessionScalarFieldEnum)[keyof typeof ParkingSessionScalarFieldEnum]


  export const TicketScalarFieldEnum: {
    id: 'id',
    garageId: 'garageId',
    vehicleId: 'vehicleId',
    sessionId: 'sessionId',
    ticketNumber: 'ticketNumber',
    type: 'type',
    status: 'status',
    description: 'description',
    violationTime: 'violationTime',
    location: 'location',
    fineAmount: 'fineAmount',
    isPaid: 'isPaid',
    paymentDueDate: 'paymentDueDate',
    issuedBy: 'issuedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type TicketScalarFieldEnum = (typeof TicketScalarFieldEnum)[keyof typeof TicketScalarFieldEnum]


  export const PaymentScalarFieldEnum: {
    id: 'id',
    garageId: 'garageId',
    vehicleId: 'vehicleId',
    sessionId: 'sessionId',
    ticketId: 'ticketId',
    paymentNumber: 'paymentNumber',
    type: 'type',
    method: 'method',
    status: 'status',
    amount: 'amount',
    currency: 'currency',
    transactionId: 'transactionId',
    gatewayResponse: 'gatewayResponse',
    paymentDate: 'paymentDate',
    processedAt: 'processedAt',
    refundAmount: 'refundAmount',
    refundDate: 'refundDate',
    refundReason: 'refundReason',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type PaymentScalarFieldEnum = (typeof PaymentScalarFieldEnum)[keyof typeof PaymentScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'SpotType'
   */
  export type EnumSpotTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SpotType'>
    


  /**
   * Reference to a field of type 'SpotStatus'
   */
  export type EnumSpotStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SpotStatus'>
    


  /**
   * Reference to a field of type 'VehicleType'
   */
  export type EnumVehicleTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'VehicleType'>
    


  /**
   * Reference to a field of type 'VehicleStatus'
   */
  export type EnumVehicleStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'VehicleStatus'>
    


  /**
   * Reference to a field of type 'SessionStatus'
   */
  export type EnumSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SessionStatus'>
    


  /**
   * Reference to a field of type 'RateType'
   */
  export type EnumRateTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RateType'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'TicketType'
   */
  export type EnumTicketTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TicketType'>
    


  /**
   * Reference to a field of type 'TicketStatus'
   */
  export type EnumTicketStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TicketStatus'>
    


  /**
   * Reference to a field of type 'PaymentType'
   */
  export type EnumPaymentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentType'>
    


  /**
   * Reference to a field of type 'PaymentMethod'
   */
  export type EnumPaymentMethodFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentMethod'>
    


  /**
   * Reference to a field of type 'PaymentStatus'
   */
  export type EnumPaymentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PaymentStatus'>
    
  /**
   * Deep Input Types
   */


  export type GarageWhereInput = {
    AND?: GarageWhereInput | GarageWhereInput[]
    OR?: GarageWhereInput[]
    NOT?: GarageWhereInput | GarageWhereInput[]
    id?: StringFilter<"Garage"> | string
    name?: StringFilter<"Garage"> | string
    description?: StringNullableFilter<"Garage"> | string | null
    totalFloors?: IntFilter<"Garage"> | number
    totalSpots?: IntFilter<"Garage"> | number
    isActive?: BoolFilter<"Garage"> | boolean
    operatingHours?: StringNullableFilter<"Garage"> | string | null
    createdAt?: DateTimeFilter<"Garage"> | Date | string
    updatedAt?: DateTimeFilter<"Garage"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Garage"> | Date | string | null
    floors?: FloorListRelationFilter
    spots?: SpotListRelationFilter
    sessions?: ParkingSessionListRelationFilter
    tickets?: TicketListRelationFilter
    payments?: PaymentListRelationFilter
  }

  export type GarageOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    totalFloors?: SortOrder
    totalSpots?: SortOrder
    isActive?: SortOrder
    operatingHours?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    floors?: FloorOrderByRelationAggregateInput
    spots?: SpotOrderByRelationAggregateInput
    sessions?: ParkingSessionOrderByRelationAggregateInput
    tickets?: TicketOrderByRelationAggregateInput
    payments?: PaymentOrderByRelationAggregateInput
  }

  export type GarageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    AND?: GarageWhereInput | GarageWhereInput[]
    OR?: GarageWhereInput[]
    NOT?: GarageWhereInput | GarageWhereInput[]
    description?: StringNullableFilter<"Garage"> | string | null
    totalFloors?: IntFilter<"Garage"> | number
    totalSpots?: IntFilter<"Garage"> | number
    isActive?: BoolFilter<"Garage"> | boolean
    operatingHours?: StringNullableFilter<"Garage"> | string | null
    createdAt?: DateTimeFilter<"Garage"> | Date | string
    updatedAt?: DateTimeFilter<"Garage"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Garage"> | Date | string | null
    floors?: FloorListRelationFilter
    spots?: SpotListRelationFilter
    sessions?: ParkingSessionListRelationFilter
    tickets?: TicketListRelationFilter
    payments?: PaymentListRelationFilter
  }, "id" | "name">

  export type GarageOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    totalFloors?: SortOrder
    totalSpots?: SortOrder
    isActive?: SortOrder
    operatingHours?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: GarageCountOrderByAggregateInput
    _avg?: GarageAvgOrderByAggregateInput
    _max?: GarageMaxOrderByAggregateInput
    _min?: GarageMinOrderByAggregateInput
    _sum?: GarageSumOrderByAggregateInput
  }

  export type GarageScalarWhereWithAggregatesInput = {
    AND?: GarageScalarWhereWithAggregatesInput | GarageScalarWhereWithAggregatesInput[]
    OR?: GarageScalarWhereWithAggregatesInput[]
    NOT?: GarageScalarWhereWithAggregatesInput | GarageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Garage"> | string
    name?: StringWithAggregatesFilter<"Garage"> | string
    description?: StringNullableWithAggregatesFilter<"Garage"> | string | null
    totalFloors?: IntWithAggregatesFilter<"Garage"> | number
    totalSpots?: IntWithAggregatesFilter<"Garage"> | number
    isActive?: BoolWithAggregatesFilter<"Garage"> | boolean
    operatingHours?: StringNullableWithAggregatesFilter<"Garage"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Garage"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Garage"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Garage"> | Date | string | null
  }

  export type FloorWhereInput = {
    AND?: FloorWhereInput | FloorWhereInput[]
    OR?: FloorWhereInput[]
    NOT?: FloorWhereInput | FloorWhereInput[]
    id?: StringFilter<"Floor"> | string
    garageId?: StringFilter<"Floor"> | string
    number?: IntFilter<"Floor"> | number
    name?: StringNullableFilter<"Floor"> | string | null
    bays?: IntFilter<"Floor"> | number
    spotsPerBay?: IntFilter<"Floor"> | number
    isActive?: BoolFilter<"Floor"> | boolean
    createdAt?: DateTimeFilter<"Floor"> | Date | string
    updatedAt?: DateTimeFilter<"Floor"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Floor"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    spots?: SpotListRelationFilter
  }

  export type FloorOrderByWithRelationInput = {
    id?: SortOrder
    garageId?: SortOrder
    number?: SortOrder
    name?: SortOrderInput | SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    garage?: GarageOrderByWithRelationInput
    spots?: SpotOrderByRelationAggregateInput
  }

  export type FloorWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    garageId_number?: FloorGarageIdNumberCompoundUniqueInput
    AND?: FloorWhereInput | FloorWhereInput[]
    OR?: FloorWhereInput[]
    NOT?: FloorWhereInput | FloorWhereInput[]
    garageId?: StringFilter<"Floor"> | string
    number?: IntFilter<"Floor"> | number
    name?: StringNullableFilter<"Floor"> | string | null
    bays?: IntFilter<"Floor"> | number
    spotsPerBay?: IntFilter<"Floor"> | number
    isActive?: BoolFilter<"Floor"> | boolean
    createdAt?: DateTimeFilter<"Floor"> | Date | string
    updatedAt?: DateTimeFilter<"Floor"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Floor"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    spots?: SpotListRelationFilter
  }, "id" | "garageId_number">

  export type FloorOrderByWithAggregationInput = {
    id?: SortOrder
    garageId?: SortOrder
    number?: SortOrder
    name?: SortOrderInput | SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: FloorCountOrderByAggregateInput
    _avg?: FloorAvgOrderByAggregateInput
    _max?: FloorMaxOrderByAggregateInput
    _min?: FloorMinOrderByAggregateInput
    _sum?: FloorSumOrderByAggregateInput
  }

  export type FloorScalarWhereWithAggregatesInput = {
    AND?: FloorScalarWhereWithAggregatesInput | FloorScalarWhereWithAggregatesInput[]
    OR?: FloorScalarWhereWithAggregatesInput[]
    NOT?: FloorScalarWhereWithAggregatesInput | FloorScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Floor"> | string
    garageId?: StringWithAggregatesFilter<"Floor"> | string
    number?: IntWithAggregatesFilter<"Floor"> | number
    name?: StringNullableWithAggregatesFilter<"Floor"> | string | null
    bays?: IntWithAggregatesFilter<"Floor"> | number
    spotsPerBay?: IntWithAggregatesFilter<"Floor"> | number
    isActive?: BoolWithAggregatesFilter<"Floor"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Floor"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Floor"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Floor"> | Date | string | null
  }

  export type SpotWhereInput = {
    AND?: SpotWhereInput | SpotWhereInput[]
    OR?: SpotWhereInput[]
    NOT?: SpotWhereInput | SpotWhereInput[]
    id?: StringFilter<"Spot"> | string
    garageId?: StringFilter<"Spot"> | string
    floorId?: StringNullableFilter<"Spot"> | string | null
    floor?: IntFilter<"Spot"> | number
    bay?: IntFilter<"Spot"> | number
    spotNumber?: StringFilter<"Spot"> | string
    type?: EnumSpotTypeFilter<"Spot"> | $Enums.SpotType
    status?: EnumSpotStatusFilter<"Spot"> | $Enums.SpotStatus
    features?: StringFilter<"Spot"> | string
    currentVehicleId?: StringNullableFilter<"Spot"> | string | null
    createdAt?: DateTimeFilter<"Spot"> | Date | string
    updatedAt?: DateTimeFilter<"Spot"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Spot"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    floorRel?: XOR<FloorNullableScalarRelationFilter, FloorWhereInput> | null
    currentVehicle?: XOR<VehicleNullableScalarRelationFilter, VehicleWhereInput> | null
    sessions?: ParkingSessionListRelationFilter
  }

  export type SpotOrderByWithRelationInput = {
    id?: SortOrder
    garageId?: SortOrder
    floorId?: SortOrderInput | SortOrder
    floor?: SortOrder
    bay?: SortOrder
    spotNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    features?: SortOrder
    currentVehicleId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    garage?: GarageOrderByWithRelationInput
    floorRel?: FloorOrderByWithRelationInput
    currentVehicle?: VehicleOrderByWithRelationInput
    sessions?: ParkingSessionOrderByRelationAggregateInput
  }

  export type SpotWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    currentVehicleId?: string
    garageId_spotNumber?: SpotGarageIdSpotNumberCompoundUniqueInput
    AND?: SpotWhereInput | SpotWhereInput[]
    OR?: SpotWhereInput[]
    NOT?: SpotWhereInput | SpotWhereInput[]
    garageId?: StringFilter<"Spot"> | string
    floorId?: StringNullableFilter<"Spot"> | string | null
    floor?: IntFilter<"Spot"> | number
    bay?: IntFilter<"Spot"> | number
    spotNumber?: StringFilter<"Spot"> | string
    type?: EnumSpotTypeFilter<"Spot"> | $Enums.SpotType
    status?: EnumSpotStatusFilter<"Spot"> | $Enums.SpotStatus
    features?: StringFilter<"Spot"> | string
    createdAt?: DateTimeFilter<"Spot"> | Date | string
    updatedAt?: DateTimeFilter<"Spot"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Spot"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    floorRel?: XOR<FloorNullableScalarRelationFilter, FloorWhereInput> | null
    currentVehicle?: XOR<VehicleNullableScalarRelationFilter, VehicleWhereInput> | null
    sessions?: ParkingSessionListRelationFilter
  }, "id" | "currentVehicleId" | "garageId_spotNumber">

  export type SpotOrderByWithAggregationInput = {
    id?: SortOrder
    garageId?: SortOrder
    floorId?: SortOrderInput | SortOrder
    floor?: SortOrder
    bay?: SortOrder
    spotNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    features?: SortOrder
    currentVehicleId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: SpotCountOrderByAggregateInput
    _avg?: SpotAvgOrderByAggregateInput
    _max?: SpotMaxOrderByAggregateInput
    _min?: SpotMinOrderByAggregateInput
    _sum?: SpotSumOrderByAggregateInput
  }

  export type SpotScalarWhereWithAggregatesInput = {
    AND?: SpotScalarWhereWithAggregatesInput | SpotScalarWhereWithAggregatesInput[]
    OR?: SpotScalarWhereWithAggregatesInput[]
    NOT?: SpotScalarWhereWithAggregatesInput | SpotScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Spot"> | string
    garageId?: StringWithAggregatesFilter<"Spot"> | string
    floorId?: StringNullableWithAggregatesFilter<"Spot"> | string | null
    floor?: IntWithAggregatesFilter<"Spot"> | number
    bay?: IntWithAggregatesFilter<"Spot"> | number
    spotNumber?: StringWithAggregatesFilter<"Spot"> | string
    type?: EnumSpotTypeWithAggregatesFilter<"Spot"> | $Enums.SpotType
    status?: EnumSpotStatusWithAggregatesFilter<"Spot"> | $Enums.SpotStatus
    features?: StringWithAggregatesFilter<"Spot"> | string
    currentVehicleId?: StringNullableWithAggregatesFilter<"Spot"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Spot"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Spot"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Spot"> | Date | string | null
  }

  export type VehicleWhereInput = {
    AND?: VehicleWhereInput | VehicleWhereInput[]
    OR?: VehicleWhereInput[]
    NOT?: VehicleWhereInput | VehicleWhereInput[]
    id?: StringFilter<"Vehicle"> | string
    licensePlate?: StringFilter<"Vehicle"> | string
    vehicleType?: EnumVehicleTypeFilter<"Vehicle"> | $Enums.VehicleType
    make?: StringNullableFilter<"Vehicle"> | string | null
    model?: StringNullableFilter<"Vehicle"> | string | null
    color?: StringNullableFilter<"Vehicle"> | string | null
    year?: IntNullableFilter<"Vehicle"> | number | null
    ownerName?: StringNullableFilter<"Vehicle"> | string | null
    ownerEmail?: StringNullableFilter<"Vehicle"> | string | null
    ownerPhone?: StringNullableFilter<"Vehicle"> | string | null
    status?: EnumVehicleStatusFilter<"Vehicle"> | $Enums.VehicleStatus
    currentSpotId?: StringNullableFilter<"Vehicle"> | string | null
    createdAt?: DateTimeFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeFilter<"Vehicle"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Vehicle"> | Date | string | null
    currentSpot?: XOR<SpotNullableScalarRelationFilter, SpotWhereInput> | null
    sessions?: ParkingSessionListRelationFilter
    tickets?: TicketListRelationFilter
    payments?: PaymentListRelationFilter
  }

  export type VehicleOrderByWithRelationInput = {
    id?: SortOrder
    licensePlate?: SortOrder
    vehicleType?: SortOrder
    make?: SortOrderInput | SortOrder
    model?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    year?: SortOrderInput | SortOrder
    ownerName?: SortOrderInput | SortOrder
    ownerEmail?: SortOrderInput | SortOrder
    ownerPhone?: SortOrderInput | SortOrder
    status?: SortOrder
    currentSpotId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    currentSpot?: SpotOrderByWithRelationInput
    sessions?: ParkingSessionOrderByRelationAggregateInput
    tickets?: TicketOrderByRelationAggregateInput
    payments?: PaymentOrderByRelationAggregateInput
  }

  export type VehicleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    licensePlate?: string
    currentSpotId?: string
    AND?: VehicleWhereInput | VehicleWhereInput[]
    OR?: VehicleWhereInput[]
    NOT?: VehicleWhereInput | VehicleWhereInput[]
    vehicleType?: EnumVehicleTypeFilter<"Vehicle"> | $Enums.VehicleType
    make?: StringNullableFilter<"Vehicle"> | string | null
    model?: StringNullableFilter<"Vehicle"> | string | null
    color?: StringNullableFilter<"Vehicle"> | string | null
    year?: IntNullableFilter<"Vehicle"> | number | null
    ownerName?: StringNullableFilter<"Vehicle"> | string | null
    ownerEmail?: StringNullableFilter<"Vehicle"> | string | null
    ownerPhone?: StringNullableFilter<"Vehicle"> | string | null
    status?: EnumVehicleStatusFilter<"Vehicle"> | $Enums.VehicleStatus
    createdAt?: DateTimeFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeFilter<"Vehicle"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Vehicle"> | Date | string | null
    currentSpot?: XOR<SpotNullableScalarRelationFilter, SpotWhereInput> | null
    sessions?: ParkingSessionListRelationFilter
    tickets?: TicketListRelationFilter
    payments?: PaymentListRelationFilter
  }, "id" | "licensePlate" | "currentSpotId">

  export type VehicleOrderByWithAggregationInput = {
    id?: SortOrder
    licensePlate?: SortOrder
    vehicleType?: SortOrder
    make?: SortOrderInput | SortOrder
    model?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    year?: SortOrderInput | SortOrder
    ownerName?: SortOrderInput | SortOrder
    ownerEmail?: SortOrderInput | SortOrder
    ownerPhone?: SortOrderInput | SortOrder
    status?: SortOrder
    currentSpotId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: VehicleCountOrderByAggregateInput
    _avg?: VehicleAvgOrderByAggregateInput
    _max?: VehicleMaxOrderByAggregateInput
    _min?: VehicleMinOrderByAggregateInput
    _sum?: VehicleSumOrderByAggregateInput
  }

  export type VehicleScalarWhereWithAggregatesInput = {
    AND?: VehicleScalarWhereWithAggregatesInput | VehicleScalarWhereWithAggregatesInput[]
    OR?: VehicleScalarWhereWithAggregatesInput[]
    NOT?: VehicleScalarWhereWithAggregatesInput | VehicleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Vehicle"> | string
    licensePlate?: StringWithAggregatesFilter<"Vehicle"> | string
    vehicleType?: EnumVehicleTypeWithAggregatesFilter<"Vehicle"> | $Enums.VehicleType
    make?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    model?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    color?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    year?: IntNullableWithAggregatesFilter<"Vehicle"> | number | null
    ownerName?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    ownerEmail?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    ownerPhone?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    status?: EnumVehicleStatusWithAggregatesFilter<"Vehicle"> | $Enums.VehicleStatus
    currentSpotId?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Vehicle"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Vehicle"> | Date | string | null
  }

  export type ParkingSessionWhereInput = {
    AND?: ParkingSessionWhereInput | ParkingSessionWhereInput[]
    OR?: ParkingSessionWhereInput[]
    NOT?: ParkingSessionWhereInput | ParkingSessionWhereInput[]
    id?: StringFilter<"ParkingSession"> | string
    garageId?: StringFilter<"ParkingSession"> | string
    spotId?: StringFilter<"ParkingSession"> | string
    vehicleId?: StringFilter<"ParkingSession"> | string
    status?: EnumSessionStatusFilter<"ParkingSession"> | $Enums.SessionStatus
    rateType?: EnumRateTypeFilter<"ParkingSession"> | $Enums.RateType
    checkInTime?: DateTimeFilter<"ParkingSession"> | Date | string
    checkOutTime?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    expectedEndTime?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    durationMinutes?: IntNullableFilter<"ParkingSession"> | number | null
    hourlyRate?: FloatNullableFilter<"ParkingSession"> | number | null
    totalAmount?: FloatFilter<"ParkingSession"> | number
    isPaid?: BoolFilter<"ParkingSession"> | boolean
    notes?: StringNullableFilter<"ParkingSession"> | string | null
    metadata?: StringNullableFilter<"ParkingSession"> | string | null
    endReason?: StringNullableFilter<"ParkingSession"> | string | null
    createdAt?: DateTimeFilter<"ParkingSession"> | Date | string
    updatedAt?: DateTimeFilter<"ParkingSession"> | Date | string
    deletedAt?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    spot?: XOR<SpotScalarRelationFilter, SpotWhereInput>
    vehicle?: XOR<VehicleScalarRelationFilter, VehicleWhereInput>
    tickets?: TicketListRelationFilter
    payments?: PaymentListRelationFilter
  }

  export type ParkingSessionOrderByWithRelationInput = {
    id?: SortOrder
    garageId?: SortOrder
    spotId?: SortOrder
    vehicleId?: SortOrder
    status?: SortOrder
    rateType?: SortOrder
    checkInTime?: SortOrder
    checkOutTime?: SortOrderInput | SortOrder
    expectedEndTime?: SortOrderInput | SortOrder
    durationMinutes?: SortOrderInput | SortOrder
    hourlyRate?: SortOrderInput | SortOrder
    totalAmount?: SortOrder
    isPaid?: SortOrder
    notes?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    endReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    garage?: GarageOrderByWithRelationInput
    spot?: SpotOrderByWithRelationInput
    vehicle?: VehicleOrderByWithRelationInput
    tickets?: TicketOrderByRelationAggregateInput
    payments?: PaymentOrderByRelationAggregateInput
  }

  export type ParkingSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ParkingSessionWhereInput | ParkingSessionWhereInput[]
    OR?: ParkingSessionWhereInput[]
    NOT?: ParkingSessionWhereInput | ParkingSessionWhereInput[]
    garageId?: StringFilter<"ParkingSession"> | string
    spotId?: StringFilter<"ParkingSession"> | string
    vehicleId?: StringFilter<"ParkingSession"> | string
    status?: EnumSessionStatusFilter<"ParkingSession"> | $Enums.SessionStatus
    rateType?: EnumRateTypeFilter<"ParkingSession"> | $Enums.RateType
    checkInTime?: DateTimeFilter<"ParkingSession"> | Date | string
    checkOutTime?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    expectedEndTime?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    durationMinutes?: IntNullableFilter<"ParkingSession"> | number | null
    hourlyRate?: FloatNullableFilter<"ParkingSession"> | number | null
    totalAmount?: FloatFilter<"ParkingSession"> | number
    isPaid?: BoolFilter<"ParkingSession"> | boolean
    notes?: StringNullableFilter<"ParkingSession"> | string | null
    metadata?: StringNullableFilter<"ParkingSession"> | string | null
    endReason?: StringNullableFilter<"ParkingSession"> | string | null
    createdAt?: DateTimeFilter<"ParkingSession"> | Date | string
    updatedAt?: DateTimeFilter<"ParkingSession"> | Date | string
    deletedAt?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    spot?: XOR<SpotScalarRelationFilter, SpotWhereInput>
    vehicle?: XOR<VehicleScalarRelationFilter, VehicleWhereInput>
    tickets?: TicketListRelationFilter
    payments?: PaymentListRelationFilter
  }, "id">

  export type ParkingSessionOrderByWithAggregationInput = {
    id?: SortOrder
    garageId?: SortOrder
    spotId?: SortOrder
    vehicleId?: SortOrder
    status?: SortOrder
    rateType?: SortOrder
    checkInTime?: SortOrder
    checkOutTime?: SortOrderInput | SortOrder
    expectedEndTime?: SortOrderInput | SortOrder
    durationMinutes?: SortOrderInput | SortOrder
    hourlyRate?: SortOrderInput | SortOrder
    totalAmount?: SortOrder
    isPaid?: SortOrder
    notes?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    endReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: ParkingSessionCountOrderByAggregateInput
    _avg?: ParkingSessionAvgOrderByAggregateInput
    _max?: ParkingSessionMaxOrderByAggregateInput
    _min?: ParkingSessionMinOrderByAggregateInput
    _sum?: ParkingSessionSumOrderByAggregateInput
  }

  export type ParkingSessionScalarWhereWithAggregatesInput = {
    AND?: ParkingSessionScalarWhereWithAggregatesInput | ParkingSessionScalarWhereWithAggregatesInput[]
    OR?: ParkingSessionScalarWhereWithAggregatesInput[]
    NOT?: ParkingSessionScalarWhereWithAggregatesInput | ParkingSessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ParkingSession"> | string
    garageId?: StringWithAggregatesFilter<"ParkingSession"> | string
    spotId?: StringWithAggregatesFilter<"ParkingSession"> | string
    vehicleId?: StringWithAggregatesFilter<"ParkingSession"> | string
    status?: EnumSessionStatusWithAggregatesFilter<"ParkingSession"> | $Enums.SessionStatus
    rateType?: EnumRateTypeWithAggregatesFilter<"ParkingSession"> | $Enums.RateType
    checkInTime?: DateTimeWithAggregatesFilter<"ParkingSession"> | Date | string
    checkOutTime?: DateTimeNullableWithAggregatesFilter<"ParkingSession"> | Date | string | null
    expectedEndTime?: DateTimeNullableWithAggregatesFilter<"ParkingSession"> | Date | string | null
    durationMinutes?: IntNullableWithAggregatesFilter<"ParkingSession"> | number | null
    hourlyRate?: FloatNullableWithAggregatesFilter<"ParkingSession"> | number | null
    totalAmount?: FloatWithAggregatesFilter<"ParkingSession"> | number
    isPaid?: BoolWithAggregatesFilter<"ParkingSession"> | boolean
    notes?: StringNullableWithAggregatesFilter<"ParkingSession"> | string | null
    metadata?: StringNullableWithAggregatesFilter<"ParkingSession"> | string | null
    endReason?: StringNullableWithAggregatesFilter<"ParkingSession"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ParkingSession"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ParkingSession"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ParkingSession"> | Date | string | null
  }

  export type TicketWhereInput = {
    AND?: TicketWhereInput | TicketWhereInput[]
    OR?: TicketWhereInput[]
    NOT?: TicketWhereInput | TicketWhereInput[]
    id?: StringFilter<"Ticket"> | string
    garageId?: StringFilter<"Ticket"> | string
    vehicleId?: StringFilter<"Ticket"> | string
    sessionId?: StringNullableFilter<"Ticket"> | string | null
    ticketNumber?: StringFilter<"Ticket"> | string
    type?: EnumTicketTypeFilter<"Ticket"> | $Enums.TicketType
    status?: EnumTicketStatusFilter<"Ticket"> | $Enums.TicketStatus
    description?: StringFilter<"Ticket"> | string
    violationTime?: DateTimeFilter<"Ticket"> | Date | string
    location?: StringNullableFilter<"Ticket"> | string | null
    fineAmount?: FloatFilter<"Ticket"> | number
    isPaid?: BoolFilter<"Ticket"> | boolean
    paymentDueDate?: DateTimeNullableFilter<"Ticket"> | Date | string | null
    issuedBy?: StringNullableFilter<"Ticket"> | string | null
    createdAt?: DateTimeFilter<"Ticket"> | Date | string
    updatedAt?: DateTimeFilter<"Ticket"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Ticket"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    vehicle?: XOR<VehicleScalarRelationFilter, VehicleWhereInput>
    session?: XOR<ParkingSessionNullableScalarRelationFilter, ParkingSessionWhereInput> | null
    payments?: PaymentListRelationFilter
  }

  export type TicketOrderByWithRelationInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrderInput | SortOrder
    ticketNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    description?: SortOrder
    violationTime?: SortOrder
    location?: SortOrderInput | SortOrder
    fineAmount?: SortOrder
    isPaid?: SortOrder
    paymentDueDate?: SortOrderInput | SortOrder
    issuedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    garage?: GarageOrderByWithRelationInput
    vehicle?: VehicleOrderByWithRelationInput
    session?: ParkingSessionOrderByWithRelationInput
    payments?: PaymentOrderByRelationAggregateInput
  }

  export type TicketWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    ticketNumber?: string
    AND?: TicketWhereInput | TicketWhereInput[]
    OR?: TicketWhereInput[]
    NOT?: TicketWhereInput | TicketWhereInput[]
    garageId?: StringFilter<"Ticket"> | string
    vehicleId?: StringFilter<"Ticket"> | string
    sessionId?: StringNullableFilter<"Ticket"> | string | null
    type?: EnumTicketTypeFilter<"Ticket"> | $Enums.TicketType
    status?: EnumTicketStatusFilter<"Ticket"> | $Enums.TicketStatus
    description?: StringFilter<"Ticket"> | string
    violationTime?: DateTimeFilter<"Ticket"> | Date | string
    location?: StringNullableFilter<"Ticket"> | string | null
    fineAmount?: FloatFilter<"Ticket"> | number
    isPaid?: BoolFilter<"Ticket"> | boolean
    paymentDueDate?: DateTimeNullableFilter<"Ticket"> | Date | string | null
    issuedBy?: StringNullableFilter<"Ticket"> | string | null
    createdAt?: DateTimeFilter<"Ticket"> | Date | string
    updatedAt?: DateTimeFilter<"Ticket"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Ticket"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    vehicle?: XOR<VehicleScalarRelationFilter, VehicleWhereInput>
    session?: XOR<ParkingSessionNullableScalarRelationFilter, ParkingSessionWhereInput> | null
    payments?: PaymentListRelationFilter
  }, "id" | "ticketNumber">

  export type TicketOrderByWithAggregationInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrderInput | SortOrder
    ticketNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    description?: SortOrder
    violationTime?: SortOrder
    location?: SortOrderInput | SortOrder
    fineAmount?: SortOrder
    isPaid?: SortOrder
    paymentDueDate?: SortOrderInput | SortOrder
    issuedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: TicketCountOrderByAggregateInput
    _avg?: TicketAvgOrderByAggregateInput
    _max?: TicketMaxOrderByAggregateInput
    _min?: TicketMinOrderByAggregateInput
    _sum?: TicketSumOrderByAggregateInput
  }

  export type TicketScalarWhereWithAggregatesInput = {
    AND?: TicketScalarWhereWithAggregatesInput | TicketScalarWhereWithAggregatesInput[]
    OR?: TicketScalarWhereWithAggregatesInput[]
    NOT?: TicketScalarWhereWithAggregatesInput | TicketScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Ticket"> | string
    garageId?: StringWithAggregatesFilter<"Ticket"> | string
    vehicleId?: StringWithAggregatesFilter<"Ticket"> | string
    sessionId?: StringNullableWithAggregatesFilter<"Ticket"> | string | null
    ticketNumber?: StringWithAggregatesFilter<"Ticket"> | string
    type?: EnumTicketTypeWithAggregatesFilter<"Ticket"> | $Enums.TicketType
    status?: EnumTicketStatusWithAggregatesFilter<"Ticket"> | $Enums.TicketStatus
    description?: StringWithAggregatesFilter<"Ticket"> | string
    violationTime?: DateTimeWithAggregatesFilter<"Ticket"> | Date | string
    location?: StringNullableWithAggregatesFilter<"Ticket"> | string | null
    fineAmount?: FloatWithAggregatesFilter<"Ticket"> | number
    isPaid?: BoolWithAggregatesFilter<"Ticket"> | boolean
    paymentDueDate?: DateTimeNullableWithAggregatesFilter<"Ticket"> | Date | string | null
    issuedBy?: StringNullableWithAggregatesFilter<"Ticket"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Ticket"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Ticket"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Ticket"> | Date | string | null
  }

  export type PaymentWhereInput = {
    AND?: PaymentWhereInput | PaymentWhereInput[]
    OR?: PaymentWhereInput[]
    NOT?: PaymentWhereInput | PaymentWhereInput[]
    id?: StringFilter<"Payment"> | string
    garageId?: StringFilter<"Payment"> | string
    vehicleId?: StringNullableFilter<"Payment"> | string | null
    sessionId?: StringNullableFilter<"Payment"> | string | null
    ticketId?: StringNullableFilter<"Payment"> | string | null
    paymentNumber?: StringFilter<"Payment"> | string
    type?: EnumPaymentTypeFilter<"Payment"> | $Enums.PaymentType
    method?: EnumPaymentMethodFilter<"Payment"> | $Enums.PaymentMethod
    status?: EnumPaymentStatusFilter<"Payment"> | $Enums.PaymentStatus
    amount?: FloatFilter<"Payment"> | number
    currency?: StringFilter<"Payment"> | string
    transactionId?: StringNullableFilter<"Payment"> | string | null
    gatewayResponse?: StringNullableFilter<"Payment"> | string | null
    paymentDate?: DateTimeFilter<"Payment"> | Date | string
    processedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundAmount?: FloatFilter<"Payment"> | number
    refundDate?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundReason?: StringNullableFilter<"Payment"> | string | null
    createdAt?: DateTimeFilter<"Payment"> | Date | string
    updatedAt?: DateTimeFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    vehicle?: XOR<VehicleNullableScalarRelationFilter, VehicleWhereInput> | null
    session?: XOR<ParkingSessionNullableScalarRelationFilter, ParkingSessionWhereInput> | null
    ticket?: XOR<TicketNullableScalarRelationFilter, TicketWhereInput> | null
  }

  export type PaymentOrderByWithRelationInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrderInput | SortOrder
    sessionId?: SortOrderInput | SortOrder
    ticketId?: SortOrderInput | SortOrder
    paymentNumber?: SortOrder
    type?: SortOrder
    method?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    transactionId?: SortOrderInput | SortOrder
    gatewayResponse?: SortOrderInput | SortOrder
    paymentDate?: SortOrder
    processedAt?: SortOrderInput | SortOrder
    refundAmount?: SortOrder
    refundDate?: SortOrderInput | SortOrder
    refundReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    garage?: GarageOrderByWithRelationInput
    vehicle?: VehicleOrderByWithRelationInput
    session?: ParkingSessionOrderByWithRelationInput
    ticket?: TicketOrderByWithRelationInput
  }

  export type PaymentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    paymentNumber?: string
    AND?: PaymentWhereInput | PaymentWhereInput[]
    OR?: PaymentWhereInput[]
    NOT?: PaymentWhereInput | PaymentWhereInput[]
    garageId?: StringFilter<"Payment"> | string
    vehicleId?: StringNullableFilter<"Payment"> | string | null
    sessionId?: StringNullableFilter<"Payment"> | string | null
    ticketId?: StringNullableFilter<"Payment"> | string | null
    type?: EnumPaymentTypeFilter<"Payment"> | $Enums.PaymentType
    method?: EnumPaymentMethodFilter<"Payment"> | $Enums.PaymentMethod
    status?: EnumPaymentStatusFilter<"Payment"> | $Enums.PaymentStatus
    amount?: FloatFilter<"Payment"> | number
    currency?: StringFilter<"Payment"> | string
    transactionId?: StringNullableFilter<"Payment"> | string | null
    gatewayResponse?: StringNullableFilter<"Payment"> | string | null
    paymentDate?: DateTimeFilter<"Payment"> | Date | string
    processedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundAmount?: FloatFilter<"Payment"> | number
    refundDate?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundReason?: StringNullableFilter<"Payment"> | string | null
    createdAt?: DateTimeFilter<"Payment"> | Date | string
    updatedAt?: DateTimeFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    garage?: XOR<GarageScalarRelationFilter, GarageWhereInput>
    vehicle?: XOR<VehicleNullableScalarRelationFilter, VehicleWhereInput> | null
    session?: XOR<ParkingSessionNullableScalarRelationFilter, ParkingSessionWhereInput> | null
    ticket?: XOR<TicketNullableScalarRelationFilter, TicketWhereInput> | null
  }, "id" | "paymentNumber">

  export type PaymentOrderByWithAggregationInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrderInput | SortOrder
    sessionId?: SortOrderInput | SortOrder
    ticketId?: SortOrderInput | SortOrder
    paymentNumber?: SortOrder
    type?: SortOrder
    method?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    transactionId?: SortOrderInput | SortOrder
    gatewayResponse?: SortOrderInput | SortOrder
    paymentDate?: SortOrder
    processedAt?: SortOrderInput | SortOrder
    refundAmount?: SortOrder
    refundDate?: SortOrderInput | SortOrder
    refundReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: PaymentCountOrderByAggregateInput
    _avg?: PaymentAvgOrderByAggregateInput
    _max?: PaymentMaxOrderByAggregateInput
    _min?: PaymentMinOrderByAggregateInput
    _sum?: PaymentSumOrderByAggregateInput
  }

  export type PaymentScalarWhereWithAggregatesInput = {
    AND?: PaymentScalarWhereWithAggregatesInput | PaymentScalarWhereWithAggregatesInput[]
    OR?: PaymentScalarWhereWithAggregatesInput[]
    NOT?: PaymentScalarWhereWithAggregatesInput | PaymentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Payment"> | string
    garageId?: StringWithAggregatesFilter<"Payment"> | string
    vehicleId?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    sessionId?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    ticketId?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    paymentNumber?: StringWithAggregatesFilter<"Payment"> | string
    type?: EnumPaymentTypeWithAggregatesFilter<"Payment"> | $Enums.PaymentType
    method?: EnumPaymentMethodWithAggregatesFilter<"Payment"> | $Enums.PaymentMethod
    status?: EnumPaymentStatusWithAggregatesFilter<"Payment"> | $Enums.PaymentStatus
    amount?: FloatWithAggregatesFilter<"Payment"> | number
    currency?: StringWithAggregatesFilter<"Payment"> | string
    transactionId?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    gatewayResponse?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    paymentDate?: DateTimeWithAggregatesFilter<"Payment"> | Date | string
    processedAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
    refundAmount?: FloatWithAggregatesFilter<"Payment"> | number
    refundDate?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
    refundReason?: StringNullableWithAggregatesFilter<"Payment"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Payment"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Payment"> | Date | string | null
  }

  export type GarageCreateInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorCreateNestedManyWithoutGarageInput
    spots?: SpotCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionCreateNestedManyWithoutGarageInput
    tickets?: TicketCreateNestedManyWithoutGarageInput
    payments?: PaymentCreateNestedManyWithoutGarageInput
  }

  export type GarageUncheckedCreateInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorUncheckedCreateNestedManyWithoutGarageInput
    spots?: SpotUncheckedCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutGarageInput
    tickets?: TicketUncheckedCreateNestedManyWithoutGarageInput
    payments?: PaymentUncheckedCreateNestedManyWithoutGarageInput
  }

  export type GarageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUpdateManyWithoutGarageNestedInput
    spots?: SpotUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUpdateManyWithoutGarageNestedInput
    tickets?: TicketUpdateManyWithoutGarageNestedInput
    payments?: PaymentUpdateManyWithoutGarageNestedInput
  }

  export type GarageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUncheckedUpdateManyWithoutGarageNestedInput
    spots?: SpotUncheckedUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutGarageNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutGarageNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutGarageNestedInput
  }

  export type GarageCreateManyInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type GarageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GarageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FloorCreateInput = {
    id?: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutFloorsInput
    spots?: SpotCreateNestedManyWithoutFloorRelInput
  }

  export type FloorUncheckedCreateInput = {
    id?: string
    garageId: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    spots?: SpotUncheckedCreateNestedManyWithoutFloorRelInput
  }

  export type FloorUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutFloorsNestedInput
    spots?: SpotUpdateManyWithoutFloorRelNestedInput
  }

  export type FloorUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    spots?: SpotUncheckedUpdateManyWithoutFloorRelNestedInput
  }

  export type FloorCreateManyInput = {
    id?: string
    garageId: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type FloorUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FloorUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SpotCreateInput = {
    id?: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSpotsInput
    floorRel?: FloorCreateNestedOneWithoutSpotsInput
    currentVehicle?: VehicleCreateNestedOneWithoutCurrentSpotInput
    sessions?: ParkingSessionCreateNestedManyWithoutSpotInput
  }

  export type SpotUncheckedCreateInput = {
    id?: string
    garageId: string
    floorId?: string | null
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutSpotInput
  }

  export type SpotUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSpotsNestedInput
    floorRel?: FloorUpdateOneWithoutSpotsNestedInput
    currentVehicle?: VehicleUpdateOneWithoutCurrentSpotNestedInput
    sessions?: ParkingSessionUpdateManyWithoutSpotNestedInput
  }

  export type SpotUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    floorId?: NullableStringFieldUpdateOperationsInput | string | null
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: ParkingSessionUncheckedUpdateManyWithoutSpotNestedInput
  }

  export type SpotCreateManyInput = {
    id?: string
    garageId: string
    floorId?: string | null
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type SpotUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SpotUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    floorId?: NullableStringFieldUpdateOperationsInput | string | null
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type VehicleCreateInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotCreateNestedOneWithoutCurrentVehicleInput
    sessions?: ParkingSessionCreateNestedManyWithoutVehicleInput
    tickets?: TicketCreateNestedManyWithoutVehicleInput
    payments?: PaymentCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotUncheckedCreateNestedOneWithoutCurrentVehicleInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutVehicleInput
    tickets?: TicketUncheckedCreateNestedManyWithoutVehicleInput
    payments?: PaymentUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUpdateOneWithoutCurrentVehicleNestedInput
    sessions?: ParkingSessionUpdateManyWithoutVehicleNestedInput
    tickets?: TicketUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUncheckedUpdateOneWithoutCurrentVehicleNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutVehicleNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleCreateManyInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type VehicleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type VehicleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParkingSessionCreateInput = {
    id?: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSessionsInput
    spot: SpotCreateNestedOneWithoutSessionsInput
    vehicle: VehicleCreateNestedOneWithoutSessionsInput
    tickets?: TicketCreateNestedManyWithoutSessionInput
    payments?: PaymentCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUncheckedCreateInput = {
    id?: string
    garageId: string
    spotId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tickets?: TicketUncheckedCreateNestedManyWithoutSessionInput
    payments?: PaymentUncheckedCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSessionsNestedInput
    spot?: SpotUpdateOneRequiredWithoutSessionsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutSessionsNestedInput
    tickets?: TicketUpdateManyWithoutSessionNestedInput
    payments?: PaymentUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tickets?: TicketUncheckedUpdateManyWithoutSessionNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionCreateManyInput = {
    id?: string
    garageId: string
    spotId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ParkingSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParkingSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TicketCreateInput = {
    id?: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutTicketsInput
    vehicle: VehicleCreateNestedOneWithoutTicketsInput
    session?: ParkingSessionCreateNestedOneWithoutTicketsInput
    payments?: PaymentCreateNestedManyWithoutTicketInput
  }

  export type TicketUncheckedCreateInput = {
    id?: string
    garageId: string
    vehicleId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    payments?: PaymentUncheckedCreateNestedManyWithoutTicketInput
  }

  export type TicketUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutTicketsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutTicketsNestedInput
    session?: ParkingSessionUpdateOneWithoutTicketsNestedInput
    payments?: PaymentUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    payments?: PaymentUncheckedUpdateManyWithoutTicketNestedInput
  }

  export type TicketCreateManyInput = {
    id?: string
    garageId: string
    vehicleId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TicketUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TicketUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentCreateInput = {
    id?: string
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutPaymentsInput
    vehicle?: VehicleCreateNestedOneWithoutPaymentsInput
    session?: ParkingSessionCreateNestedOneWithoutPaymentsInput
    ticket?: TicketCreateNestedOneWithoutPaymentsInput
  }

  export type PaymentUncheckedCreateInput = {
    id?: string
    garageId: string
    vehicleId?: string | null
    sessionId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutPaymentsNestedInput
    vehicle?: VehicleUpdateOneWithoutPaymentsNestedInput
    session?: ParkingSessionUpdateOneWithoutPaymentsNestedInput
    ticket?: TicketUpdateOneWithoutPaymentsNestedInput
  }

  export type PaymentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentCreateManyInput = {
    id?: string
    garageId: string
    vehicleId?: string | null
    sessionId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type FloorListRelationFilter = {
    every?: FloorWhereInput
    some?: FloorWhereInput
    none?: FloorWhereInput
  }

  export type SpotListRelationFilter = {
    every?: SpotWhereInput
    some?: SpotWhereInput
    none?: SpotWhereInput
  }

  export type ParkingSessionListRelationFilter = {
    every?: ParkingSessionWhereInput
    some?: ParkingSessionWhereInput
    none?: ParkingSessionWhereInput
  }

  export type TicketListRelationFilter = {
    every?: TicketWhereInput
    some?: TicketWhereInput
    none?: TicketWhereInput
  }

  export type PaymentListRelationFilter = {
    every?: PaymentWhereInput
    some?: PaymentWhereInput
    none?: PaymentWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type FloorOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SpotOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ParkingSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TicketOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PaymentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GarageCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    totalFloors?: SortOrder
    totalSpots?: SortOrder
    isActive?: SortOrder
    operatingHours?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type GarageAvgOrderByAggregateInput = {
    totalFloors?: SortOrder
    totalSpots?: SortOrder
  }

  export type GarageMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    totalFloors?: SortOrder
    totalSpots?: SortOrder
    isActive?: SortOrder
    operatingHours?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type GarageMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    totalFloors?: SortOrder
    totalSpots?: SortOrder
    isActive?: SortOrder
    operatingHours?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type GarageSumOrderByAggregateInput = {
    totalFloors?: SortOrder
    totalSpots?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type GarageScalarRelationFilter = {
    is?: GarageWhereInput
    isNot?: GarageWhereInput
  }

  export type FloorGarageIdNumberCompoundUniqueInput = {
    garageId: string
    number: number
  }

  export type FloorCountOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    number?: SortOrder
    name?: SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type FloorAvgOrderByAggregateInput = {
    number?: SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
  }

  export type FloorMaxOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    number?: SortOrder
    name?: SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type FloorMinOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    number?: SortOrder
    name?: SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type FloorSumOrderByAggregateInput = {
    number?: SortOrder
    bays?: SortOrder
    spotsPerBay?: SortOrder
  }

  export type EnumSpotTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotType | EnumSpotTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SpotType[]
    notIn?: $Enums.SpotType[]
    not?: NestedEnumSpotTypeFilter<$PrismaModel> | $Enums.SpotType
  }

  export type EnumSpotStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotStatus | EnumSpotStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SpotStatus[]
    notIn?: $Enums.SpotStatus[]
    not?: NestedEnumSpotStatusFilter<$PrismaModel> | $Enums.SpotStatus
  }

  export type FloorNullableScalarRelationFilter = {
    is?: FloorWhereInput | null
    isNot?: FloorWhereInput | null
  }

  export type VehicleNullableScalarRelationFilter = {
    is?: VehicleWhereInput | null
    isNot?: VehicleWhereInput | null
  }

  export type SpotGarageIdSpotNumberCompoundUniqueInput = {
    garageId: string
    spotNumber: string
  }

  export type SpotCountOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    floorId?: SortOrder
    floor?: SortOrder
    bay?: SortOrder
    spotNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    features?: SortOrder
    currentVehicleId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type SpotAvgOrderByAggregateInput = {
    floor?: SortOrder
    bay?: SortOrder
  }

  export type SpotMaxOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    floorId?: SortOrder
    floor?: SortOrder
    bay?: SortOrder
    spotNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    features?: SortOrder
    currentVehicleId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type SpotMinOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    floorId?: SortOrder
    floor?: SortOrder
    bay?: SortOrder
    spotNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    features?: SortOrder
    currentVehicleId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type SpotSumOrderByAggregateInput = {
    floor?: SortOrder
    bay?: SortOrder
  }

  export type EnumSpotTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotType | EnumSpotTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SpotType[]
    notIn?: $Enums.SpotType[]
    not?: NestedEnumSpotTypeWithAggregatesFilter<$PrismaModel> | $Enums.SpotType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSpotTypeFilter<$PrismaModel>
    _max?: NestedEnumSpotTypeFilter<$PrismaModel>
  }

  export type EnumSpotStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotStatus | EnumSpotStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SpotStatus[]
    notIn?: $Enums.SpotStatus[]
    not?: NestedEnumSpotStatusWithAggregatesFilter<$PrismaModel> | $Enums.SpotStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSpotStatusFilter<$PrismaModel>
    _max?: NestedEnumSpotStatusFilter<$PrismaModel>
  }

  export type EnumVehicleTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleType | EnumVehicleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleType[]
    notIn?: $Enums.VehicleType[]
    not?: NestedEnumVehicleTypeFilter<$PrismaModel> | $Enums.VehicleType
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumVehicleStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleStatus | EnumVehicleStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleStatus[]
    notIn?: $Enums.VehicleStatus[]
    not?: NestedEnumVehicleStatusFilter<$PrismaModel> | $Enums.VehicleStatus
  }

  export type SpotNullableScalarRelationFilter = {
    is?: SpotWhereInput | null
    isNot?: SpotWhereInput | null
  }

  export type VehicleCountOrderByAggregateInput = {
    id?: SortOrder
    licensePlate?: SortOrder
    vehicleType?: SortOrder
    make?: SortOrder
    model?: SortOrder
    color?: SortOrder
    year?: SortOrder
    ownerName?: SortOrder
    ownerEmail?: SortOrder
    ownerPhone?: SortOrder
    status?: SortOrder
    currentSpotId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type VehicleAvgOrderByAggregateInput = {
    year?: SortOrder
  }

  export type VehicleMaxOrderByAggregateInput = {
    id?: SortOrder
    licensePlate?: SortOrder
    vehicleType?: SortOrder
    make?: SortOrder
    model?: SortOrder
    color?: SortOrder
    year?: SortOrder
    ownerName?: SortOrder
    ownerEmail?: SortOrder
    ownerPhone?: SortOrder
    status?: SortOrder
    currentSpotId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type VehicleMinOrderByAggregateInput = {
    id?: SortOrder
    licensePlate?: SortOrder
    vehicleType?: SortOrder
    make?: SortOrder
    model?: SortOrder
    color?: SortOrder
    year?: SortOrder
    ownerName?: SortOrder
    ownerEmail?: SortOrder
    ownerPhone?: SortOrder
    status?: SortOrder
    currentSpotId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type VehicleSumOrderByAggregateInput = {
    year?: SortOrder
  }

  export type EnumVehicleTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleType | EnumVehicleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleType[]
    notIn?: $Enums.VehicleType[]
    not?: NestedEnumVehicleTypeWithAggregatesFilter<$PrismaModel> | $Enums.VehicleType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVehicleTypeFilter<$PrismaModel>
    _max?: NestedEnumVehicleTypeFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumVehicleStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleStatus | EnumVehicleStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleStatus[]
    notIn?: $Enums.VehicleStatus[]
    not?: NestedEnumVehicleStatusWithAggregatesFilter<$PrismaModel> | $Enums.VehicleStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVehicleStatusFilter<$PrismaModel>
    _max?: NestedEnumVehicleStatusFilter<$PrismaModel>
  }

  export type EnumSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[]
    notIn?: $Enums.SessionStatus[]
    not?: NestedEnumSessionStatusFilter<$PrismaModel> | $Enums.SessionStatus
  }

  export type EnumRateTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.RateType | EnumRateTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RateType[]
    notIn?: $Enums.RateType[]
    not?: NestedEnumRateTypeFilter<$PrismaModel> | $Enums.RateType
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type SpotScalarRelationFilter = {
    is?: SpotWhereInput
    isNot?: SpotWhereInput
  }

  export type VehicleScalarRelationFilter = {
    is?: VehicleWhereInput
    isNot?: VehicleWhereInput
  }

  export type ParkingSessionCountOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    spotId?: SortOrder
    vehicleId?: SortOrder
    status?: SortOrder
    rateType?: SortOrder
    checkInTime?: SortOrder
    checkOutTime?: SortOrder
    expectedEndTime?: SortOrder
    durationMinutes?: SortOrder
    hourlyRate?: SortOrder
    totalAmount?: SortOrder
    isPaid?: SortOrder
    notes?: SortOrder
    metadata?: SortOrder
    endReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type ParkingSessionAvgOrderByAggregateInput = {
    durationMinutes?: SortOrder
    hourlyRate?: SortOrder
    totalAmount?: SortOrder
  }

  export type ParkingSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    spotId?: SortOrder
    vehicleId?: SortOrder
    status?: SortOrder
    rateType?: SortOrder
    checkInTime?: SortOrder
    checkOutTime?: SortOrder
    expectedEndTime?: SortOrder
    durationMinutes?: SortOrder
    hourlyRate?: SortOrder
    totalAmount?: SortOrder
    isPaid?: SortOrder
    notes?: SortOrder
    metadata?: SortOrder
    endReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type ParkingSessionMinOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    spotId?: SortOrder
    vehicleId?: SortOrder
    status?: SortOrder
    rateType?: SortOrder
    checkInTime?: SortOrder
    checkOutTime?: SortOrder
    expectedEndTime?: SortOrder
    durationMinutes?: SortOrder
    hourlyRate?: SortOrder
    totalAmount?: SortOrder
    isPaid?: SortOrder
    notes?: SortOrder
    metadata?: SortOrder
    endReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type ParkingSessionSumOrderByAggregateInput = {
    durationMinutes?: SortOrder
    hourlyRate?: SortOrder
    totalAmount?: SortOrder
  }

  export type EnumSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[]
    notIn?: $Enums.SessionStatus[]
    not?: NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumSessionStatusFilter<$PrismaModel>
  }

  export type EnumRateTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RateType | EnumRateTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RateType[]
    notIn?: $Enums.RateType[]
    not?: NestedEnumRateTypeWithAggregatesFilter<$PrismaModel> | $Enums.RateType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRateTypeFilter<$PrismaModel>
    _max?: NestedEnumRateTypeFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type EnumTicketTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketType | EnumTicketTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TicketType[]
    notIn?: $Enums.TicketType[]
    not?: NestedEnumTicketTypeFilter<$PrismaModel> | $Enums.TicketType
  }

  export type EnumTicketStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketStatus | EnumTicketStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TicketStatus[]
    notIn?: $Enums.TicketStatus[]
    not?: NestedEnumTicketStatusFilter<$PrismaModel> | $Enums.TicketStatus
  }

  export type ParkingSessionNullableScalarRelationFilter = {
    is?: ParkingSessionWhereInput | null
    isNot?: ParkingSessionWhereInput | null
  }

  export type TicketCountOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrder
    ticketNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    description?: SortOrder
    violationTime?: SortOrder
    location?: SortOrder
    fineAmount?: SortOrder
    isPaid?: SortOrder
    paymentDueDate?: SortOrder
    issuedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TicketAvgOrderByAggregateInput = {
    fineAmount?: SortOrder
  }

  export type TicketMaxOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrder
    ticketNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    description?: SortOrder
    violationTime?: SortOrder
    location?: SortOrder
    fineAmount?: SortOrder
    isPaid?: SortOrder
    paymentDueDate?: SortOrder
    issuedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TicketMinOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrder
    ticketNumber?: SortOrder
    type?: SortOrder
    status?: SortOrder
    description?: SortOrder
    violationTime?: SortOrder
    location?: SortOrder
    fineAmount?: SortOrder
    isPaid?: SortOrder
    paymentDueDate?: SortOrder
    issuedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type TicketSumOrderByAggregateInput = {
    fineAmount?: SortOrder
  }

  export type EnumTicketTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketType | EnumTicketTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TicketType[]
    notIn?: $Enums.TicketType[]
    not?: NestedEnumTicketTypeWithAggregatesFilter<$PrismaModel> | $Enums.TicketType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTicketTypeFilter<$PrismaModel>
    _max?: NestedEnumTicketTypeFilter<$PrismaModel>
  }

  export type EnumTicketStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketStatus | EnumTicketStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TicketStatus[]
    notIn?: $Enums.TicketStatus[]
    not?: NestedEnumTicketStatusWithAggregatesFilter<$PrismaModel> | $Enums.TicketStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTicketStatusFilter<$PrismaModel>
    _max?: NestedEnumTicketStatusFilter<$PrismaModel>
  }

  export type EnumPaymentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentType | EnumPaymentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentType[]
    notIn?: $Enums.PaymentType[]
    not?: NestedEnumPaymentTypeFilter<$PrismaModel> | $Enums.PaymentType
  }

  export type EnumPaymentMethodFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentMethod[]
    notIn?: $Enums.PaymentMethod[]
    not?: NestedEnumPaymentMethodFilter<$PrismaModel> | $Enums.PaymentMethod
  }

  export type EnumPaymentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[]
    notIn?: $Enums.PaymentStatus[]
    not?: NestedEnumPaymentStatusFilter<$PrismaModel> | $Enums.PaymentStatus
  }

  export type TicketNullableScalarRelationFilter = {
    is?: TicketWhereInput | null
    isNot?: TicketWhereInput | null
  }

  export type PaymentCountOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrder
    ticketId?: SortOrder
    paymentNumber?: SortOrder
    type?: SortOrder
    method?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    transactionId?: SortOrder
    gatewayResponse?: SortOrder
    paymentDate?: SortOrder
    processedAt?: SortOrder
    refundAmount?: SortOrder
    refundDate?: SortOrder
    refundReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type PaymentAvgOrderByAggregateInput = {
    amount?: SortOrder
    refundAmount?: SortOrder
  }

  export type PaymentMaxOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrder
    ticketId?: SortOrder
    paymentNumber?: SortOrder
    type?: SortOrder
    method?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    transactionId?: SortOrder
    gatewayResponse?: SortOrder
    paymentDate?: SortOrder
    processedAt?: SortOrder
    refundAmount?: SortOrder
    refundDate?: SortOrder
    refundReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type PaymentMinOrderByAggregateInput = {
    id?: SortOrder
    garageId?: SortOrder
    vehicleId?: SortOrder
    sessionId?: SortOrder
    ticketId?: SortOrder
    paymentNumber?: SortOrder
    type?: SortOrder
    method?: SortOrder
    status?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    transactionId?: SortOrder
    gatewayResponse?: SortOrder
    paymentDate?: SortOrder
    processedAt?: SortOrder
    refundAmount?: SortOrder
    refundDate?: SortOrder
    refundReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type PaymentSumOrderByAggregateInput = {
    amount?: SortOrder
    refundAmount?: SortOrder
  }

  export type EnumPaymentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentType | EnumPaymentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentType[]
    notIn?: $Enums.PaymentType[]
    not?: NestedEnumPaymentTypeWithAggregatesFilter<$PrismaModel> | $Enums.PaymentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentTypeFilter<$PrismaModel>
    _max?: NestedEnumPaymentTypeFilter<$PrismaModel>
  }

  export type EnumPaymentMethodWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentMethod[]
    notIn?: $Enums.PaymentMethod[]
    not?: NestedEnumPaymentMethodWithAggregatesFilter<$PrismaModel> | $Enums.PaymentMethod
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentMethodFilter<$PrismaModel>
    _max?: NestedEnumPaymentMethodFilter<$PrismaModel>
  }

  export type EnumPaymentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[]
    notIn?: $Enums.PaymentStatus[]
    not?: NestedEnumPaymentStatusWithAggregatesFilter<$PrismaModel> | $Enums.PaymentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentStatusFilter<$PrismaModel>
    _max?: NestedEnumPaymentStatusFilter<$PrismaModel>
  }

  export type FloorCreateNestedManyWithoutGarageInput = {
    create?: XOR<FloorCreateWithoutGarageInput, FloorUncheckedCreateWithoutGarageInput> | FloorCreateWithoutGarageInput[] | FloorUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: FloorCreateOrConnectWithoutGarageInput | FloorCreateOrConnectWithoutGarageInput[]
    createMany?: FloorCreateManyGarageInputEnvelope
    connect?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
  }

  export type SpotCreateNestedManyWithoutGarageInput = {
    create?: XOR<SpotCreateWithoutGarageInput, SpotUncheckedCreateWithoutGarageInput> | SpotCreateWithoutGarageInput[] | SpotUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutGarageInput | SpotCreateOrConnectWithoutGarageInput[]
    createMany?: SpotCreateManyGarageInputEnvelope
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
  }

  export type ParkingSessionCreateNestedManyWithoutGarageInput = {
    create?: XOR<ParkingSessionCreateWithoutGarageInput, ParkingSessionUncheckedCreateWithoutGarageInput> | ParkingSessionCreateWithoutGarageInput[] | ParkingSessionUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutGarageInput | ParkingSessionCreateOrConnectWithoutGarageInput[]
    createMany?: ParkingSessionCreateManyGarageInputEnvelope
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
  }

  export type TicketCreateNestedManyWithoutGarageInput = {
    create?: XOR<TicketCreateWithoutGarageInput, TicketUncheckedCreateWithoutGarageInput> | TicketCreateWithoutGarageInput[] | TicketUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutGarageInput | TicketCreateOrConnectWithoutGarageInput[]
    createMany?: TicketCreateManyGarageInputEnvelope
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
  }

  export type PaymentCreateNestedManyWithoutGarageInput = {
    create?: XOR<PaymentCreateWithoutGarageInput, PaymentUncheckedCreateWithoutGarageInput> | PaymentCreateWithoutGarageInput[] | PaymentUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutGarageInput | PaymentCreateOrConnectWithoutGarageInput[]
    createMany?: PaymentCreateManyGarageInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type FloorUncheckedCreateNestedManyWithoutGarageInput = {
    create?: XOR<FloorCreateWithoutGarageInput, FloorUncheckedCreateWithoutGarageInput> | FloorCreateWithoutGarageInput[] | FloorUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: FloorCreateOrConnectWithoutGarageInput | FloorCreateOrConnectWithoutGarageInput[]
    createMany?: FloorCreateManyGarageInputEnvelope
    connect?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
  }

  export type SpotUncheckedCreateNestedManyWithoutGarageInput = {
    create?: XOR<SpotCreateWithoutGarageInput, SpotUncheckedCreateWithoutGarageInput> | SpotCreateWithoutGarageInput[] | SpotUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutGarageInput | SpotCreateOrConnectWithoutGarageInput[]
    createMany?: SpotCreateManyGarageInputEnvelope
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
  }

  export type ParkingSessionUncheckedCreateNestedManyWithoutGarageInput = {
    create?: XOR<ParkingSessionCreateWithoutGarageInput, ParkingSessionUncheckedCreateWithoutGarageInput> | ParkingSessionCreateWithoutGarageInput[] | ParkingSessionUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutGarageInput | ParkingSessionCreateOrConnectWithoutGarageInput[]
    createMany?: ParkingSessionCreateManyGarageInputEnvelope
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
  }

  export type TicketUncheckedCreateNestedManyWithoutGarageInput = {
    create?: XOR<TicketCreateWithoutGarageInput, TicketUncheckedCreateWithoutGarageInput> | TicketCreateWithoutGarageInput[] | TicketUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutGarageInput | TicketCreateOrConnectWithoutGarageInput[]
    createMany?: TicketCreateManyGarageInputEnvelope
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
  }

  export type PaymentUncheckedCreateNestedManyWithoutGarageInput = {
    create?: XOR<PaymentCreateWithoutGarageInput, PaymentUncheckedCreateWithoutGarageInput> | PaymentCreateWithoutGarageInput[] | PaymentUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutGarageInput | PaymentCreateOrConnectWithoutGarageInput[]
    createMany?: PaymentCreateManyGarageInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type FloorUpdateManyWithoutGarageNestedInput = {
    create?: XOR<FloorCreateWithoutGarageInput, FloorUncheckedCreateWithoutGarageInput> | FloorCreateWithoutGarageInput[] | FloorUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: FloorCreateOrConnectWithoutGarageInput | FloorCreateOrConnectWithoutGarageInput[]
    upsert?: FloorUpsertWithWhereUniqueWithoutGarageInput | FloorUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: FloorCreateManyGarageInputEnvelope
    set?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    disconnect?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    delete?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    connect?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    update?: FloorUpdateWithWhereUniqueWithoutGarageInput | FloorUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: FloorUpdateManyWithWhereWithoutGarageInput | FloorUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: FloorScalarWhereInput | FloorScalarWhereInput[]
  }

  export type SpotUpdateManyWithoutGarageNestedInput = {
    create?: XOR<SpotCreateWithoutGarageInput, SpotUncheckedCreateWithoutGarageInput> | SpotCreateWithoutGarageInput[] | SpotUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutGarageInput | SpotCreateOrConnectWithoutGarageInput[]
    upsert?: SpotUpsertWithWhereUniqueWithoutGarageInput | SpotUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: SpotCreateManyGarageInputEnvelope
    set?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    disconnect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    delete?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    update?: SpotUpdateWithWhereUniqueWithoutGarageInput | SpotUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: SpotUpdateManyWithWhereWithoutGarageInput | SpotUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: SpotScalarWhereInput | SpotScalarWhereInput[]
  }

  export type ParkingSessionUpdateManyWithoutGarageNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutGarageInput, ParkingSessionUncheckedCreateWithoutGarageInput> | ParkingSessionCreateWithoutGarageInput[] | ParkingSessionUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutGarageInput | ParkingSessionCreateOrConnectWithoutGarageInput[]
    upsert?: ParkingSessionUpsertWithWhereUniqueWithoutGarageInput | ParkingSessionUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: ParkingSessionCreateManyGarageInputEnvelope
    set?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    disconnect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    delete?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    update?: ParkingSessionUpdateWithWhereUniqueWithoutGarageInput | ParkingSessionUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: ParkingSessionUpdateManyWithWhereWithoutGarageInput | ParkingSessionUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
  }

  export type TicketUpdateManyWithoutGarageNestedInput = {
    create?: XOR<TicketCreateWithoutGarageInput, TicketUncheckedCreateWithoutGarageInput> | TicketCreateWithoutGarageInput[] | TicketUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutGarageInput | TicketCreateOrConnectWithoutGarageInput[]
    upsert?: TicketUpsertWithWhereUniqueWithoutGarageInput | TicketUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: TicketCreateManyGarageInputEnvelope
    set?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    disconnect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    delete?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    update?: TicketUpdateWithWhereUniqueWithoutGarageInput | TicketUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: TicketUpdateManyWithWhereWithoutGarageInput | TicketUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: TicketScalarWhereInput | TicketScalarWhereInput[]
  }

  export type PaymentUpdateManyWithoutGarageNestedInput = {
    create?: XOR<PaymentCreateWithoutGarageInput, PaymentUncheckedCreateWithoutGarageInput> | PaymentCreateWithoutGarageInput[] | PaymentUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutGarageInput | PaymentCreateOrConnectWithoutGarageInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutGarageInput | PaymentUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: PaymentCreateManyGarageInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutGarageInput | PaymentUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutGarageInput | PaymentUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type FloorUncheckedUpdateManyWithoutGarageNestedInput = {
    create?: XOR<FloorCreateWithoutGarageInput, FloorUncheckedCreateWithoutGarageInput> | FloorCreateWithoutGarageInput[] | FloorUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: FloorCreateOrConnectWithoutGarageInput | FloorCreateOrConnectWithoutGarageInput[]
    upsert?: FloorUpsertWithWhereUniqueWithoutGarageInput | FloorUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: FloorCreateManyGarageInputEnvelope
    set?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    disconnect?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    delete?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    connect?: FloorWhereUniqueInput | FloorWhereUniqueInput[]
    update?: FloorUpdateWithWhereUniqueWithoutGarageInput | FloorUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: FloorUpdateManyWithWhereWithoutGarageInput | FloorUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: FloorScalarWhereInput | FloorScalarWhereInput[]
  }

  export type SpotUncheckedUpdateManyWithoutGarageNestedInput = {
    create?: XOR<SpotCreateWithoutGarageInput, SpotUncheckedCreateWithoutGarageInput> | SpotCreateWithoutGarageInput[] | SpotUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutGarageInput | SpotCreateOrConnectWithoutGarageInput[]
    upsert?: SpotUpsertWithWhereUniqueWithoutGarageInput | SpotUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: SpotCreateManyGarageInputEnvelope
    set?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    disconnect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    delete?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    update?: SpotUpdateWithWhereUniqueWithoutGarageInput | SpotUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: SpotUpdateManyWithWhereWithoutGarageInput | SpotUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: SpotScalarWhereInput | SpotScalarWhereInput[]
  }

  export type ParkingSessionUncheckedUpdateManyWithoutGarageNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutGarageInput, ParkingSessionUncheckedCreateWithoutGarageInput> | ParkingSessionCreateWithoutGarageInput[] | ParkingSessionUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutGarageInput | ParkingSessionCreateOrConnectWithoutGarageInput[]
    upsert?: ParkingSessionUpsertWithWhereUniqueWithoutGarageInput | ParkingSessionUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: ParkingSessionCreateManyGarageInputEnvelope
    set?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    disconnect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    delete?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    update?: ParkingSessionUpdateWithWhereUniqueWithoutGarageInput | ParkingSessionUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: ParkingSessionUpdateManyWithWhereWithoutGarageInput | ParkingSessionUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
  }

  export type TicketUncheckedUpdateManyWithoutGarageNestedInput = {
    create?: XOR<TicketCreateWithoutGarageInput, TicketUncheckedCreateWithoutGarageInput> | TicketCreateWithoutGarageInput[] | TicketUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutGarageInput | TicketCreateOrConnectWithoutGarageInput[]
    upsert?: TicketUpsertWithWhereUniqueWithoutGarageInput | TicketUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: TicketCreateManyGarageInputEnvelope
    set?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    disconnect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    delete?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    update?: TicketUpdateWithWhereUniqueWithoutGarageInput | TicketUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: TicketUpdateManyWithWhereWithoutGarageInput | TicketUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: TicketScalarWhereInput | TicketScalarWhereInput[]
  }

  export type PaymentUncheckedUpdateManyWithoutGarageNestedInput = {
    create?: XOR<PaymentCreateWithoutGarageInput, PaymentUncheckedCreateWithoutGarageInput> | PaymentCreateWithoutGarageInput[] | PaymentUncheckedCreateWithoutGarageInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutGarageInput | PaymentCreateOrConnectWithoutGarageInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutGarageInput | PaymentUpsertWithWhereUniqueWithoutGarageInput[]
    createMany?: PaymentCreateManyGarageInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutGarageInput | PaymentUpdateWithWhereUniqueWithoutGarageInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutGarageInput | PaymentUpdateManyWithWhereWithoutGarageInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type GarageCreateNestedOneWithoutFloorsInput = {
    create?: XOR<GarageCreateWithoutFloorsInput, GarageUncheckedCreateWithoutFloorsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutFloorsInput
    connect?: GarageWhereUniqueInput
  }

  export type SpotCreateNestedManyWithoutFloorRelInput = {
    create?: XOR<SpotCreateWithoutFloorRelInput, SpotUncheckedCreateWithoutFloorRelInput> | SpotCreateWithoutFloorRelInput[] | SpotUncheckedCreateWithoutFloorRelInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutFloorRelInput | SpotCreateOrConnectWithoutFloorRelInput[]
    createMany?: SpotCreateManyFloorRelInputEnvelope
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
  }

  export type SpotUncheckedCreateNestedManyWithoutFloorRelInput = {
    create?: XOR<SpotCreateWithoutFloorRelInput, SpotUncheckedCreateWithoutFloorRelInput> | SpotCreateWithoutFloorRelInput[] | SpotUncheckedCreateWithoutFloorRelInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutFloorRelInput | SpotCreateOrConnectWithoutFloorRelInput[]
    createMany?: SpotCreateManyFloorRelInputEnvelope
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
  }

  export type GarageUpdateOneRequiredWithoutFloorsNestedInput = {
    create?: XOR<GarageCreateWithoutFloorsInput, GarageUncheckedCreateWithoutFloorsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutFloorsInput
    upsert?: GarageUpsertWithoutFloorsInput
    connect?: GarageWhereUniqueInput
    update?: XOR<XOR<GarageUpdateToOneWithWhereWithoutFloorsInput, GarageUpdateWithoutFloorsInput>, GarageUncheckedUpdateWithoutFloorsInput>
  }

  export type SpotUpdateManyWithoutFloorRelNestedInput = {
    create?: XOR<SpotCreateWithoutFloorRelInput, SpotUncheckedCreateWithoutFloorRelInput> | SpotCreateWithoutFloorRelInput[] | SpotUncheckedCreateWithoutFloorRelInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutFloorRelInput | SpotCreateOrConnectWithoutFloorRelInput[]
    upsert?: SpotUpsertWithWhereUniqueWithoutFloorRelInput | SpotUpsertWithWhereUniqueWithoutFloorRelInput[]
    createMany?: SpotCreateManyFloorRelInputEnvelope
    set?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    disconnect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    delete?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    update?: SpotUpdateWithWhereUniqueWithoutFloorRelInput | SpotUpdateWithWhereUniqueWithoutFloorRelInput[]
    updateMany?: SpotUpdateManyWithWhereWithoutFloorRelInput | SpotUpdateManyWithWhereWithoutFloorRelInput[]
    deleteMany?: SpotScalarWhereInput | SpotScalarWhereInput[]
  }

  export type SpotUncheckedUpdateManyWithoutFloorRelNestedInput = {
    create?: XOR<SpotCreateWithoutFloorRelInput, SpotUncheckedCreateWithoutFloorRelInput> | SpotCreateWithoutFloorRelInput[] | SpotUncheckedCreateWithoutFloorRelInput[]
    connectOrCreate?: SpotCreateOrConnectWithoutFloorRelInput | SpotCreateOrConnectWithoutFloorRelInput[]
    upsert?: SpotUpsertWithWhereUniqueWithoutFloorRelInput | SpotUpsertWithWhereUniqueWithoutFloorRelInput[]
    createMany?: SpotCreateManyFloorRelInputEnvelope
    set?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    disconnect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    delete?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    connect?: SpotWhereUniqueInput | SpotWhereUniqueInput[]
    update?: SpotUpdateWithWhereUniqueWithoutFloorRelInput | SpotUpdateWithWhereUniqueWithoutFloorRelInput[]
    updateMany?: SpotUpdateManyWithWhereWithoutFloorRelInput | SpotUpdateManyWithWhereWithoutFloorRelInput[]
    deleteMany?: SpotScalarWhereInput | SpotScalarWhereInput[]
  }

  export type GarageCreateNestedOneWithoutSpotsInput = {
    create?: XOR<GarageCreateWithoutSpotsInput, GarageUncheckedCreateWithoutSpotsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutSpotsInput
    connect?: GarageWhereUniqueInput
  }

  export type FloorCreateNestedOneWithoutSpotsInput = {
    create?: XOR<FloorCreateWithoutSpotsInput, FloorUncheckedCreateWithoutSpotsInput>
    connectOrCreate?: FloorCreateOrConnectWithoutSpotsInput
    connect?: FloorWhereUniqueInput
  }

  export type VehicleCreateNestedOneWithoutCurrentSpotInput = {
    create?: XOR<VehicleCreateWithoutCurrentSpotInput, VehicleUncheckedCreateWithoutCurrentSpotInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutCurrentSpotInput
    connect?: VehicleWhereUniqueInput
  }

  export type ParkingSessionCreateNestedManyWithoutSpotInput = {
    create?: XOR<ParkingSessionCreateWithoutSpotInput, ParkingSessionUncheckedCreateWithoutSpotInput> | ParkingSessionCreateWithoutSpotInput[] | ParkingSessionUncheckedCreateWithoutSpotInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutSpotInput | ParkingSessionCreateOrConnectWithoutSpotInput[]
    createMany?: ParkingSessionCreateManySpotInputEnvelope
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
  }

  export type ParkingSessionUncheckedCreateNestedManyWithoutSpotInput = {
    create?: XOR<ParkingSessionCreateWithoutSpotInput, ParkingSessionUncheckedCreateWithoutSpotInput> | ParkingSessionCreateWithoutSpotInput[] | ParkingSessionUncheckedCreateWithoutSpotInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutSpotInput | ParkingSessionCreateOrConnectWithoutSpotInput[]
    createMany?: ParkingSessionCreateManySpotInputEnvelope
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
  }

  export type EnumSpotTypeFieldUpdateOperationsInput = {
    set?: $Enums.SpotType
  }

  export type EnumSpotStatusFieldUpdateOperationsInput = {
    set?: $Enums.SpotStatus
  }

  export type GarageUpdateOneRequiredWithoutSpotsNestedInput = {
    create?: XOR<GarageCreateWithoutSpotsInput, GarageUncheckedCreateWithoutSpotsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutSpotsInput
    upsert?: GarageUpsertWithoutSpotsInput
    connect?: GarageWhereUniqueInput
    update?: XOR<XOR<GarageUpdateToOneWithWhereWithoutSpotsInput, GarageUpdateWithoutSpotsInput>, GarageUncheckedUpdateWithoutSpotsInput>
  }

  export type FloorUpdateOneWithoutSpotsNestedInput = {
    create?: XOR<FloorCreateWithoutSpotsInput, FloorUncheckedCreateWithoutSpotsInput>
    connectOrCreate?: FloorCreateOrConnectWithoutSpotsInput
    upsert?: FloorUpsertWithoutSpotsInput
    disconnect?: FloorWhereInput | boolean
    delete?: FloorWhereInput | boolean
    connect?: FloorWhereUniqueInput
    update?: XOR<XOR<FloorUpdateToOneWithWhereWithoutSpotsInput, FloorUpdateWithoutSpotsInput>, FloorUncheckedUpdateWithoutSpotsInput>
  }

  export type VehicleUpdateOneWithoutCurrentSpotNestedInput = {
    create?: XOR<VehicleCreateWithoutCurrentSpotInput, VehicleUncheckedCreateWithoutCurrentSpotInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutCurrentSpotInput
    upsert?: VehicleUpsertWithoutCurrentSpotInput
    disconnect?: VehicleWhereInput | boolean
    delete?: VehicleWhereInput | boolean
    connect?: VehicleWhereUniqueInput
    update?: XOR<XOR<VehicleUpdateToOneWithWhereWithoutCurrentSpotInput, VehicleUpdateWithoutCurrentSpotInput>, VehicleUncheckedUpdateWithoutCurrentSpotInput>
  }

  export type ParkingSessionUpdateManyWithoutSpotNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutSpotInput, ParkingSessionUncheckedCreateWithoutSpotInput> | ParkingSessionCreateWithoutSpotInput[] | ParkingSessionUncheckedCreateWithoutSpotInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutSpotInput | ParkingSessionCreateOrConnectWithoutSpotInput[]
    upsert?: ParkingSessionUpsertWithWhereUniqueWithoutSpotInput | ParkingSessionUpsertWithWhereUniqueWithoutSpotInput[]
    createMany?: ParkingSessionCreateManySpotInputEnvelope
    set?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    disconnect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    delete?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    update?: ParkingSessionUpdateWithWhereUniqueWithoutSpotInput | ParkingSessionUpdateWithWhereUniqueWithoutSpotInput[]
    updateMany?: ParkingSessionUpdateManyWithWhereWithoutSpotInput | ParkingSessionUpdateManyWithWhereWithoutSpotInput[]
    deleteMany?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
  }

  export type ParkingSessionUncheckedUpdateManyWithoutSpotNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutSpotInput, ParkingSessionUncheckedCreateWithoutSpotInput> | ParkingSessionCreateWithoutSpotInput[] | ParkingSessionUncheckedCreateWithoutSpotInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutSpotInput | ParkingSessionCreateOrConnectWithoutSpotInput[]
    upsert?: ParkingSessionUpsertWithWhereUniqueWithoutSpotInput | ParkingSessionUpsertWithWhereUniqueWithoutSpotInput[]
    createMany?: ParkingSessionCreateManySpotInputEnvelope
    set?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    disconnect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    delete?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    update?: ParkingSessionUpdateWithWhereUniqueWithoutSpotInput | ParkingSessionUpdateWithWhereUniqueWithoutSpotInput[]
    updateMany?: ParkingSessionUpdateManyWithWhereWithoutSpotInput | ParkingSessionUpdateManyWithWhereWithoutSpotInput[]
    deleteMany?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
  }

  export type SpotCreateNestedOneWithoutCurrentVehicleInput = {
    create?: XOR<SpotCreateWithoutCurrentVehicleInput, SpotUncheckedCreateWithoutCurrentVehicleInput>
    connectOrCreate?: SpotCreateOrConnectWithoutCurrentVehicleInput
    connect?: SpotWhereUniqueInput
  }

  export type ParkingSessionCreateNestedManyWithoutVehicleInput = {
    create?: XOR<ParkingSessionCreateWithoutVehicleInput, ParkingSessionUncheckedCreateWithoutVehicleInput> | ParkingSessionCreateWithoutVehicleInput[] | ParkingSessionUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutVehicleInput | ParkingSessionCreateOrConnectWithoutVehicleInput[]
    createMany?: ParkingSessionCreateManyVehicleInputEnvelope
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
  }

  export type TicketCreateNestedManyWithoutVehicleInput = {
    create?: XOR<TicketCreateWithoutVehicleInput, TicketUncheckedCreateWithoutVehicleInput> | TicketCreateWithoutVehicleInput[] | TicketUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutVehicleInput | TicketCreateOrConnectWithoutVehicleInput[]
    createMany?: TicketCreateManyVehicleInputEnvelope
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
  }

  export type PaymentCreateNestedManyWithoutVehicleInput = {
    create?: XOR<PaymentCreateWithoutVehicleInput, PaymentUncheckedCreateWithoutVehicleInput> | PaymentCreateWithoutVehicleInput[] | PaymentUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutVehicleInput | PaymentCreateOrConnectWithoutVehicleInput[]
    createMany?: PaymentCreateManyVehicleInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type SpotUncheckedCreateNestedOneWithoutCurrentVehicleInput = {
    create?: XOR<SpotCreateWithoutCurrentVehicleInput, SpotUncheckedCreateWithoutCurrentVehicleInput>
    connectOrCreate?: SpotCreateOrConnectWithoutCurrentVehicleInput
    connect?: SpotWhereUniqueInput
  }

  export type ParkingSessionUncheckedCreateNestedManyWithoutVehicleInput = {
    create?: XOR<ParkingSessionCreateWithoutVehicleInput, ParkingSessionUncheckedCreateWithoutVehicleInput> | ParkingSessionCreateWithoutVehicleInput[] | ParkingSessionUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutVehicleInput | ParkingSessionCreateOrConnectWithoutVehicleInput[]
    createMany?: ParkingSessionCreateManyVehicleInputEnvelope
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
  }

  export type TicketUncheckedCreateNestedManyWithoutVehicleInput = {
    create?: XOR<TicketCreateWithoutVehicleInput, TicketUncheckedCreateWithoutVehicleInput> | TicketCreateWithoutVehicleInput[] | TicketUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutVehicleInput | TicketCreateOrConnectWithoutVehicleInput[]
    createMany?: TicketCreateManyVehicleInputEnvelope
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
  }

  export type PaymentUncheckedCreateNestedManyWithoutVehicleInput = {
    create?: XOR<PaymentCreateWithoutVehicleInput, PaymentUncheckedCreateWithoutVehicleInput> | PaymentCreateWithoutVehicleInput[] | PaymentUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutVehicleInput | PaymentCreateOrConnectWithoutVehicleInput[]
    createMany?: PaymentCreateManyVehicleInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type EnumVehicleTypeFieldUpdateOperationsInput = {
    set?: $Enums.VehicleType
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumVehicleStatusFieldUpdateOperationsInput = {
    set?: $Enums.VehicleStatus
  }

  export type SpotUpdateOneWithoutCurrentVehicleNestedInput = {
    create?: XOR<SpotCreateWithoutCurrentVehicleInput, SpotUncheckedCreateWithoutCurrentVehicleInput>
    connectOrCreate?: SpotCreateOrConnectWithoutCurrentVehicleInput
    upsert?: SpotUpsertWithoutCurrentVehicleInput
    disconnect?: SpotWhereInput | boolean
    delete?: SpotWhereInput | boolean
    connect?: SpotWhereUniqueInput
    update?: XOR<XOR<SpotUpdateToOneWithWhereWithoutCurrentVehicleInput, SpotUpdateWithoutCurrentVehicleInput>, SpotUncheckedUpdateWithoutCurrentVehicleInput>
  }

  export type ParkingSessionUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutVehicleInput, ParkingSessionUncheckedCreateWithoutVehicleInput> | ParkingSessionCreateWithoutVehicleInput[] | ParkingSessionUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutVehicleInput | ParkingSessionCreateOrConnectWithoutVehicleInput[]
    upsert?: ParkingSessionUpsertWithWhereUniqueWithoutVehicleInput | ParkingSessionUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: ParkingSessionCreateManyVehicleInputEnvelope
    set?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    disconnect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    delete?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    update?: ParkingSessionUpdateWithWhereUniqueWithoutVehicleInput | ParkingSessionUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: ParkingSessionUpdateManyWithWhereWithoutVehicleInput | ParkingSessionUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
  }

  export type TicketUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<TicketCreateWithoutVehicleInput, TicketUncheckedCreateWithoutVehicleInput> | TicketCreateWithoutVehicleInput[] | TicketUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutVehicleInput | TicketCreateOrConnectWithoutVehicleInput[]
    upsert?: TicketUpsertWithWhereUniqueWithoutVehicleInput | TicketUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: TicketCreateManyVehicleInputEnvelope
    set?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    disconnect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    delete?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    update?: TicketUpdateWithWhereUniqueWithoutVehicleInput | TicketUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: TicketUpdateManyWithWhereWithoutVehicleInput | TicketUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: TicketScalarWhereInput | TicketScalarWhereInput[]
  }

  export type PaymentUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<PaymentCreateWithoutVehicleInput, PaymentUncheckedCreateWithoutVehicleInput> | PaymentCreateWithoutVehicleInput[] | PaymentUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutVehicleInput | PaymentCreateOrConnectWithoutVehicleInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutVehicleInput | PaymentUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: PaymentCreateManyVehicleInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutVehicleInput | PaymentUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutVehicleInput | PaymentUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type SpotUncheckedUpdateOneWithoutCurrentVehicleNestedInput = {
    create?: XOR<SpotCreateWithoutCurrentVehicleInput, SpotUncheckedCreateWithoutCurrentVehicleInput>
    connectOrCreate?: SpotCreateOrConnectWithoutCurrentVehicleInput
    upsert?: SpotUpsertWithoutCurrentVehicleInput
    disconnect?: SpotWhereInput | boolean
    delete?: SpotWhereInput | boolean
    connect?: SpotWhereUniqueInput
    update?: XOR<XOR<SpotUpdateToOneWithWhereWithoutCurrentVehicleInput, SpotUpdateWithoutCurrentVehicleInput>, SpotUncheckedUpdateWithoutCurrentVehicleInput>
  }

  export type ParkingSessionUncheckedUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutVehicleInput, ParkingSessionUncheckedCreateWithoutVehicleInput> | ParkingSessionCreateWithoutVehicleInput[] | ParkingSessionUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutVehicleInput | ParkingSessionCreateOrConnectWithoutVehicleInput[]
    upsert?: ParkingSessionUpsertWithWhereUniqueWithoutVehicleInput | ParkingSessionUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: ParkingSessionCreateManyVehicleInputEnvelope
    set?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    disconnect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    delete?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    connect?: ParkingSessionWhereUniqueInput | ParkingSessionWhereUniqueInput[]
    update?: ParkingSessionUpdateWithWhereUniqueWithoutVehicleInput | ParkingSessionUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: ParkingSessionUpdateManyWithWhereWithoutVehicleInput | ParkingSessionUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
  }

  export type TicketUncheckedUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<TicketCreateWithoutVehicleInput, TicketUncheckedCreateWithoutVehicleInput> | TicketCreateWithoutVehicleInput[] | TicketUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutVehicleInput | TicketCreateOrConnectWithoutVehicleInput[]
    upsert?: TicketUpsertWithWhereUniqueWithoutVehicleInput | TicketUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: TicketCreateManyVehicleInputEnvelope
    set?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    disconnect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    delete?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    update?: TicketUpdateWithWhereUniqueWithoutVehicleInput | TicketUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: TicketUpdateManyWithWhereWithoutVehicleInput | TicketUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: TicketScalarWhereInput | TicketScalarWhereInput[]
  }

  export type PaymentUncheckedUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<PaymentCreateWithoutVehicleInput, PaymentUncheckedCreateWithoutVehicleInput> | PaymentCreateWithoutVehicleInput[] | PaymentUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutVehicleInput | PaymentCreateOrConnectWithoutVehicleInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutVehicleInput | PaymentUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: PaymentCreateManyVehicleInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutVehicleInput | PaymentUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutVehicleInput | PaymentUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type GarageCreateNestedOneWithoutSessionsInput = {
    create?: XOR<GarageCreateWithoutSessionsInput, GarageUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutSessionsInput
    connect?: GarageWhereUniqueInput
  }

  export type SpotCreateNestedOneWithoutSessionsInput = {
    create?: XOR<SpotCreateWithoutSessionsInput, SpotUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: SpotCreateOrConnectWithoutSessionsInput
    connect?: SpotWhereUniqueInput
  }

  export type VehicleCreateNestedOneWithoutSessionsInput = {
    create?: XOR<VehicleCreateWithoutSessionsInput, VehicleUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutSessionsInput
    connect?: VehicleWhereUniqueInput
  }

  export type TicketCreateNestedManyWithoutSessionInput = {
    create?: XOR<TicketCreateWithoutSessionInput, TicketUncheckedCreateWithoutSessionInput> | TicketCreateWithoutSessionInput[] | TicketUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutSessionInput | TicketCreateOrConnectWithoutSessionInput[]
    createMany?: TicketCreateManySessionInputEnvelope
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
  }

  export type PaymentCreateNestedManyWithoutSessionInput = {
    create?: XOR<PaymentCreateWithoutSessionInput, PaymentUncheckedCreateWithoutSessionInput> | PaymentCreateWithoutSessionInput[] | PaymentUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutSessionInput | PaymentCreateOrConnectWithoutSessionInput[]
    createMany?: PaymentCreateManySessionInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type TicketUncheckedCreateNestedManyWithoutSessionInput = {
    create?: XOR<TicketCreateWithoutSessionInput, TicketUncheckedCreateWithoutSessionInput> | TicketCreateWithoutSessionInput[] | TicketUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutSessionInput | TicketCreateOrConnectWithoutSessionInput[]
    createMany?: TicketCreateManySessionInputEnvelope
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
  }

  export type PaymentUncheckedCreateNestedManyWithoutSessionInput = {
    create?: XOR<PaymentCreateWithoutSessionInput, PaymentUncheckedCreateWithoutSessionInput> | PaymentCreateWithoutSessionInput[] | PaymentUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutSessionInput | PaymentCreateOrConnectWithoutSessionInput[]
    createMany?: PaymentCreateManySessionInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type EnumSessionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SessionStatus
  }

  export type EnumRateTypeFieldUpdateOperationsInput = {
    set?: $Enums.RateType
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type GarageUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<GarageCreateWithoutSessionsInput, GarageUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutSessionsInput
    upsert?: GarageUpsertWithoutSessionsInput
    connect?: GarageWhereUniqueInput
    update?: XOR<XOR<GarageUpdateToOneWithWhereWithoutSessionsInput, GarageUpdateWithoutSessionsInput>, GarageUncheckedUpdateWithoutSessionsInput>
  }

  export type SpotUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<SpotCreateWithoutSessionsInput, SpotUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: SpotCreateOrConnectWithoutSessionsInput
    upsert?: SpotUpsertWithoutSessionsInput
    connect?: SpotWhereUniqueInput
    update?: XOR<XOR<SpotUpdateToOneWithWhereWithoutSessionsInput, SpotUpdateWithoutSessionsInput>, SpotUncheckedUpdateWithoutSessionsInput>
  }

  export type VehicleUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<VehicleCreateWithoutSessionsInput, VehicleUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutSessionsInput
    upsert?: VehicleUpsertWithoutSessionsInput
    connect?: VehicleWhereUniqueInput
    update?: XOR<XOR<VehicleUpdateToOneWithWhereWithoutSessionsInput, VehicleUpdateWithoutSessionsInput>, VehicleUncheckedUpdateWithoutSessionsInput>
  }

  export type TicketUpdateManyWithoutSessionNestedInput = {
    create?: XOR<TicketCreateWithoutSessionInput, TicketUncheckedCreateWithoutSessionInput> | TicketCreateWithoutSessionInput[] | TicketUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutSessionInput | TicketCreateOrConnectWithoutSessionInput[]
    upsert?: TicketUpsertWithWhereUniqueWithoutSessionInput | TicketUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: TicketCreateManySessionInputEnvelope
    set?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    disconnect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    delete?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    update?: TicketUpdateWithWhereUniqueWithoutSessionInput | TicketUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: TicketUpdateManyWithWhereWithoutSessionInput | TicketUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: TicketScalarWhereInput | TicketScalarWhereInput[]
  }

  export type PaymentUpdateManyWithoutSessionNestedInput = {
    create?: XOR<PaymentCreateWithoutSessionInput, PaymentUncheckedCreateWithoutSessionInput> | PaymentCreateWithoutSessionInput[] | PaymentUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutSessionInput | PaymentCreateOrConnectWithoutSessionInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutSessionInput | PaymentUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: PaymentCreateManySessionInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutSessionInput | PaymentUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutSessionInput | PaymentUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type TicketUncheckedUpdateManyWithoutSessionNestedInput = {
    create?: XOR<TicketCreateWithoutSessionInput, TicketUncheckedCreateWithoutSessionInput> | TicketCreateWithoutSessionInput[] | TicketUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: TicketCreateOrConnectWithoutSessionInput | TicketCreateOrConnectWithoutSessionInput[]
    upsert?: TicketUpsertWithWhereUniqueWithoutSessionInput | TicketUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: TicketCreateManySessionInputEnvelope
    set?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    disconnect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    delete?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    connect?: TicketWhereUniqueInput | TicketWhereUniqueInput[]
    update?: TicketUpdateWithWhereUniqueWithoutSessionInput | TicketUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: TicketUpdateManyWithWhereWithoutSessionInput | TicketUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: TicketScalarWhereInput | TicketScalarWhereInput[]
  }

  export type PaymentUncheckedUpdateManyWithoutSessionNestedInput = {
    create?: XOR<PaymentCreateWithoutSessionInput, PaymentUncheckedCreateWithoutSessionInput> | PaymentCreateWithoutSessionInput[] | PaymentUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutSessionInput | PaymentCreateOrConnectWithoutSessionInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutSessionInput | PaymentUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: PaymentCreateManySessionInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutSessionInput | PaymentUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutSessionInput | PaymentUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type GarageCreateNestedOneWithoutTicketsInput = {
    create?: XOR<GarageCreateWithoutTicketsInput, GarageUncheckedCreateWithoutTicketsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutTicketsInput
    connect?: GarageWhereUniqueInput
  }

  export type VehicleCreateNestedOneWithoutTicketsInput = {
    create?: XOR<VehicleCreateWithoutTicketsInput, VehicleUncheckedCreateWithoutTicketsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutTicketsInput
    connect?: VehicleWhereUniqueInput
  }

  export type ParkingSessionCreateNestedOneWithoutTicketsInput = {
    create?: XOR<ParkingSessionCreateWithoutTicketsInput, ParkingSessionUncheckedCreateWithoutTicketsInput>
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutTicketsInput
    connect?: ParkingSessionWhereUniqueInput
  }

  export type PaymentCreateNestedManyWithoutTicketInput = {
    create?: XOR<PaymentCreateWithoutTicketInput, PaymentUncheckedCreateWithoutTicketInput> | PaymentCreateWithoutTicketInput[] | PaymentUncheckedCreateWithoutTicketInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTicketInput | PaymentCreateOrConnectWithoutTicketInput[]
    createMany?: PaymentCreateManyTicketInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type PaymentUncheckedCreateNestedManyWithoutTicketInput = {
    create?: XOR<PaymentCreateWithoutTicketInput, PaymentUncheckedCreateWithoutTicketInput> | PaymentCreateWithoutTicketInput[] | PaymentUncheckedCreateWithoutTicketInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTicketInput | PaymentCreateOrConnectWithoutTicketInput[]
    createMany?: PaymentCreateManyTicketInputEnvelope
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
  }

  export type EnumTicketTypeFieldUpdateOperationsInput = {
    set?: $Enums.TicketType
  }

  export type EnumTicketStatusFieldUpdateOperationsInput = {
    set?: $Enums.TicketStatus
  }

  export type GarageUpdateOneRequiredWithoutTicketsNestedInput = {
    create?: XOR<GarageCreateWithoutTicketsInput, GarageUncheckedCreateWithoutTicketsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutTicketsInput
    upsert?: GarageUpsertWithoutTicketsInput
    connect?: GarageWhereUniqueInput
    update?: XOR<XOR<GarageUpdateToOneWithWhereWithoutTicketsInput, GarageUpdateWithoutTicketsInput>, GarageUncheckedUpdateWithoutTicketsInput>
  }

  export type VehicleUpdateOneRequiredWithoutTicketsNestedInput = {
    create?: XOR<VehicleCreateWithoutTicketsInput, VehicleUncheckedCreateWithoutTicketsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutTicketsInput
    upsert?: VehicleUpsertWithoutTicketsInput
    connect?: VehicleWhereUniqueInput
    update?: XOR<XOR<VehicleUpdateToOneWithWhereWithoutTicketsInput, VehicleUpdateWithoutTicketsInput>, VehicleUncheckedUpdateWithoutTicketsInput>
  }

  export type ParkingSessionUpdateOneWithoutTicketsNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutTicketsInput, ParkingSessionUncheckedCreateWithoutTicketsInput>
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutTicketsInput
    upsert?: ParkingSessionUpsertWithoutTicketsInput
    disconnect?: ParkingSessionWhereInput | boolean
    delete?: ParkingSessionWhereInput | boolean
    connect?: ParkingSessionWhereUniqueInput
    update?: XOR<XOR<ParkingSessionUpdateToOneWithWhereWithoutTicketsInput, ParkingSessionUpdateWithoutTicketsInput>, ParkingSessionUncheckedUpdateWithoutTicketsInput>
  }

  export type PaymentUpdateManyWithoutTicketNestedInput = {
    create?: XOR<PaymentCreateWithoutTicketInput, PaymentUncheckedCreateWithoutTicketInput> | PaymentCreateWithoutTicketInput[] | PaymentUncheckedCreateWithoutTicketInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTicketInput | PaymentCreateOrConnectWithoutTicketInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutTicketInput | PaymentUpsertWithWhereUniqueWithoutTicketInput[]
    createMany?: PaymentCreateManyTicketInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutTicketInput | PaymentUpdateWithWhereUniqueWithoutTicketInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutTicketInput | PaymentUpdateManyWithWhereWithoutTicketInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type PaymentUncheckedUpdateManyWithoutTicketNestedInput = {
    create?: XOR<PaymentCreateWithoutTicketInput, PaymentUncheckedCreateWithoutTicketInput> | PaymentCreateWithoutTicketInput[] | PaymentUncheckedCreateWithoutTicketInput[]
    connectOrCreate?: PaymentCreateOrConnectWithoutTicketInput | PaymentCreateOrConnectWithoutTicketInput[]
    upsert?: PaymentUpsertWithWhereUniqueWithoutTicketInput | PaymentUpsertWithWhereUniqueWithoutTicketInput[]
    createMany?: PaymentCreateManyTicketInputEnvelope
    set?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    disconnect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    delete?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    connect?: PaymentWhereUniqueInput | PaymentWhereUniqueInput[]
    update?: PaymentUpdateWithWhereUniqueWithoutTicketInput | PaymentUpdateWithWhereUniqueWithoutTicketInput[]
    updateMany?: PaymentUpdateManyWithWhereWithoutTicketInput | PaymentUpdateManyWithWhereWithoutTicketInput[]
    deleteMany?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
  }

  export type GarageCreateNestedOneWithoutPaymentsInput = {
    create?: XOR<GarageCreateWithoutPaymentsInput, GarageUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutPaymentsInput
    connect?: GarageWhereUniqueInput
  }

  export type VehicleCreateNestedOneWithoutPaymentsInput = {
    create?: XOR<VehicleCreateWithoutPaymentsInput, VehicleUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutPaymentsInput
    connect?: VehicleWhereUniqueInput
  }

  export type ParkingSessionCreateNestedOneWithoutPaymentsInput = {
    create?: XOR<ParkingSessionCreateWithoutPaymentsInput, ParkingSessionUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutPaymentsInput
    connect?: ParkingSessionWhereUniqueInput
  }

  export type TicketCreateNestedOneWithoutPaymentsInput = {
    create?: XOR<TicketCreateWithoutPaymentsInput, TicketUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: TicketCreateOrConnectWithoutPaymentsInput
    connect?: TicketWhereUniqueInput
  }

  export type EnumPaymentTypeFieldUpdateOperationsInput = {
    set?: $Enums.PaymentType
  }

  export type EnumPaymentMethodFieldUpdateOperationsInput = {
    set?: $Enums.PaymentMethod
  }

  export type EnumPaymentStatusFieldUpdateOperationsInput = {
    set?: $Enums.PaymentStatus
  }

  export type GarageUpdateOneRequiredWithoutPaymentsNestedInput = {
    create?: XOR<GarageCreateWithoutPaymentsInput, GarageUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: GarageCreateOrConnectWithoutPaymentsInput
    upsert?: GarageUpsertWithoutPaymentsInput
    connect?: GarageWhereUniqueInput
    update?: XOR<XOR<GarageUpdateToOneWithWhereWithoutPaymentsInput, GarageUpdateWithoutPaymentsInput>, GarageUncheckedUpdateWithoutPaymentsInput>
  }

  export type VehicleUpdateOneWithoutPaymentsNestedInput = {
    create?: XOR<VehicleCreateWithoutPaymentsInput, VehicleUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutPaymentsInput
    upsert?: VehicleUpsertWithoutPaymentsInput
    disconnect?: VehicleWhereInput | boolean
    delete?: VehicleWhereInput | boolean
    connect?: VehicleWhereUniqueInput
    update?: XOR<XOR<VehicleUpdateToOneWithWhereWithoutPaymentsInput, VehicleUpdateWithoutPaymentsInput>, VehicleUncheckedUpdateWithoutPaymentsInput>
  }

  export type ParkingSessionUpdateOneWithoutPaymentsNestedInput = {
    create?: XOR<ParkingSessionCreateWithoutPaymentsInput, ParkingSessionUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: ParkingSessionCreateOrConnectWithoutPaymentsInput
    upsert?: ParkingSessionUpsertWithoutPaymentsInput
    disconnect?: ParkingSessionWhereInput | boolean
    delete?: ParkingSessionWhereInput | boolean
    connect?: ParkingSessionWhereUniqueInput
    update?: XOR<XOR<ParkingSessionUpdateToOneWithWhereWithoutPaymentsInput, ParkingSessionUpdateWithoutPaymentsInput>, ParkingSessionUncheckedUpdateWithoutPaymentsInput>
  }

  export type TicketUpdateOneWithoutPaymentsNestedInput = {
    create?: XOR<TicketCreateWithoutPaymentsInput, TicketUncheckedCreateWithoutPaymentsInput>
    connectOrCreate?: TicketCreateOrConnectWithoutPaymentsInput
    upsert?: TicketUpsertWithoutPaymentsInput
    disconnect?: TicketWhereInput | boolean
    delete?: TicketWhereInput | boolean
    connect?: TicketWhereUniqueInput
    update?: XOR<XOR<TicketUpdateToOneWithWhereWithoutPaymentsInput, TicketUpdateWithoutPaymentsInput>, TicketUncheckedUpdateWithoutPaymentsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumSpotTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotType | EnumSpotTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SpotType[]
    notIn?: $Enums.SpotType[]
    not?: NestedEnumSpotTypeFilter<$PrismaModel> | $Enums.SpotType
  }

  export type NestedEnumSpotStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotStatus | EnumSpotStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SpotStatus[]
    notIn?: $Enums.SpotStatus[]
    not?: NestedEnumSpotStatusFilter<$PrismaModel> | $Enums.SpotStatus
  }

  export type NestedEnumSpotTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotType | EnumSpotTypeFieldRefInput<$PrismaModel>
    in?: $Enums.SpotType[]
    notIn?: $Enums.SpotType[]
    not?: NestedEnumSpotTypeWithAggregatesFilter<$PrismaModel> | $Enums.SpotType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSpotTypeFilter<$PrismaModel>
    _max?: NestedEnumSpotTypeFilter<$PrismaModel>
  }

  export type NestedEnumSpotStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SpotStatus | EnumSpotStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SpotStatus[]
    notIn?: $Enums.SpotStatus[]
    not?: NestedEnumSpotStatusWithAggregatesFilter<$PrismaModel> | $Enums.SpotStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSpotStatusFilter<$PrismaModel>
    _max?: NestedEnumSpotStatusFilter<$PrismaModel>
  }

  export type NestedEnumVehicleTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleType | EnumVehicleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleType[]
    notIn?: $Enums.VehicleType[]
    not?: NestedEnumVehicleTypeFilter<$PrismaModel> | $Enums.VehicleType
  }

  export type NestedEnumVehicleStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleStatus | EnumVehicleStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleStatus[]
    notIn?: $Enums.VehicleStatus[]
    not?: NestedEnumVehicleStatusFilter<$PrismaModel> | $Enums.VehicleStatus
  }

  export type NestedEnumVehicleTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleType | EnumVehicleTypeFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleType[]
    notIn?: $Enums.VehicleType[]
    not?: NestedEnumVehicleTypeWithAggregatesFilter<$PrismaModel> | $Enums.VehicleType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVehicleTypeFilter<$PrismaModel>
    _max?: NestedEnumVehicleTypeFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumVehicleStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.VehicleStatus | EnumVehicleStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VehicleStatus[]
    notIn?: $Enums.VehicleStatus[]
    not?: NestedEnumVehicleStatusWithAggregatesFilter<$PrismaModel> | $Enums.VehicleStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVehicleStatusFilter<$PrismaModel>
    _max?: NestedEnumVehicleStatusFilter<$PrismaModel>
  }

  export type NestedEnumSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[]
    notIn?: $Enums.SessionStatus[]
    not?: NestedEnumSessionStatusFilter<$PrismaModel> | $Enums.SessionStatus
  }

  export type NestedEnumRateTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.RateType | EnumRateTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RateType[]
    notIn?: $Enums.RateType[]
    not?: NestedEnumRateTypeFilter<$PrismaModel> | $Enums.RateType
  }

  export type NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[]
    notIn?: $Enums.SessionStatus[]
    not?: NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumSessionStatusFilter<$PrismaModel>
  }

  export type NestedEnumRateTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RateType | EnumRateTypeFieldRefInput<$PrismaModel>
    in?: $Enums.RateType[]
    notIn?: $Enums.RateType[]
    not?: NestedEnumRateTypeWithAggregatesFilter<$PrismaModel> | $Enums.RateType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRateTypeFilter<$PrismaModel>
    _max?: NestedEnumRateTypeFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedEnumTicketTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketType | EnumTicketTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TicketType[]
    notIn?: $Enums.TicketType[]
    not?: NestedEnumTicketTypeFilter<$PrismaModel> | $Enums.TicketType
  }

  export type NestedEnumTicketStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketStatus | EnumTicketStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TicketStatus[]
    notIn?: $Enums.TicketStatus[]
    not?: NestedEnumTicketStatusFilter<$PrismaModel> | $Enums.TicketStatus
  }

  export type NestedEnumTicketTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketType | EnumTicketTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TicketType[]
    notIn?: $Enums.TicketType[]
    not?: NestedEnumTicketTypeWithAggregatesFilter<$PrismaModel> | $Enums.TicketType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTicketTypeFilter<$PrismaModel>
    _max?: NestedEnumTicketTypeFilter<$PrismaModel>
  }

  export type NestedEnumTicketStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TicketStatus | EnumTicketStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TicketStatus[]
    notIn?: $Enums.TicketStatus[]
    not?: NestedEnumTicketStatusWithAggregatesFilter<$PrismaModel> | $Enums.TicketStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTicketStatusFilter<$PrismaModel>
    _max?: NestedEnumTicketStatusFilter<$PrismaModel>
  }

  export type NestedEnumPaymentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentType | EnumPaymentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentType[]
    notIn?: $Enums.PaymentType[]
    not?: NestedEnumPaymentTypeFilter<$PrismaModel> | $Enums.PaymentType
  }

  export type NestedEnumPaymentMethodFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentMethod[]
    notIn?: $Enums.PaymentMethod[]
    not?: NestedEnumPaymentMethodFilter<$PrismaModel> | $Enums.PaymentMethod
  }

  export type NestedEnumPaymentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[]
    notIn?: $Enums.PaymentStatus[]
    not?: NestedEnumPaymentStatusFilter<$PrismaModel> | $Enums.PaymentStatus
  }

  export type NestedEnumPaymentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentType | EnumPaymentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentType[]
    notIn?: $Enums.PaymentType[]
    not?: NestedEnumPaymentTypeWithAggregatesFilter<$PrismaModel> | $Enums.PaymentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentTypeFilter<$PrismaModel>
    _max?: NestedEnumPaymentTypeFilter<$PrismaModel>
  }

  export type NestedEnumPaymentMethodWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentMethod | EnumPaymentMethodFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentMethod[]
    notIn?: $Enums.PaymentMethod[]
    not?: NestedEnumPaymentMethodWithAggregatesFilter<$PrismaModel> | $Enums.PaymentMethod
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentMethodFilter<$PrismaModel>
    _max?: NestedEnumPaymentMethodFilter<$PrismaModel>
  }

  export type NestedEnumPaymentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PaymentStatus | EnumPaymentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PaymentStatus[]
    notIn?: $Enums.PaymentStatus[]
    not?: NestedEnumPaymentStatusWithAggregatesFilter<$PrismaModel> | $Enums.PaymentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPaymentStatusFilter<$PrismaModel>
    _max?: NestedEnumPaymentStatusFilter<$PrismaModel>
  }

  export type FloorCreateWithoutGarageInput = {
    id?: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    spots?: SpotCreateNestedManyWithoutFloorRelInput
  }

  export type FloorUncheckedCreateWithoutGarageInput = {
    id?: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    spots?: SpotUncheckedCreateNestedManyWithoutFloorRelInput
  }

  export type FloorCreateOrConnectWithoutGarageInput = {
    where: FloorWhereUniqueInput
    create: XOR<FloorCreateWithoutGarageInput, FloorUncheckedCreateWithoutGarageInput>
  }

  export type FloorCreateManyGarageInputEnvelope = {
    data: FloorCreateManyGarageInput | FloorCreateManyGarageInput[]
  }

  export type SpotCreateWithoutGarageInput = {
    id?: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floorRel?: FloorCreateNestedOneWithoutSpotsInput
    currentVehicle?: VehicleCreateNestedOneWithoutCurrentSpotInput
    sessions?: ParkingSessionCreateNestedManyWithoutSpotInput
  }

  export type SpotUncheckedCreateWithoutGarageInput = {
    id?: string
    floorId?: string | null
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutSpotInput
  }

  export type SpotCreateOrConnectWithoutGarageInput = {
    where: SpotWhereUniqueInput
    create: XOR<SpotCreateWithoutGarageInput, SpotUncheckedCreateWithoutGarageInput>
  }

  export type SpotCreateManyGarageInputEnvelope = {
    data: SpotCreateManyGarageInput | SpotCreateManyGarageInput[]
  }

  export type ParkingSessionCreateWithoutGarageInput = {
    id?: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    spot: SpotCreateNestedOneWithoutSessionsInput
    vehicle: VehicleCreateNestedOneWithoutSessionsInput
    tickets?: TicketCreateNestedManyWithoutSessionInput
    payments?: PaymentCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUncheckedCreateWithoutGarageInput = {
    id?: string
    spotId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tickets?: TicketUncheckedCreateNestedManyWithoutSessionInput
    payments?: PaymentUncheckedCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionCreateOrConnectWithoutGarageInput = {
    where: ParkingSessionWhereUniqueInput
    create: XOR<ParkingSessionCreateWithoutGarageInput, ParkingSessionUncheckedCreateWithoutGarageInput>
  }

  export type ParkingSessionCreateManyGarageInputEnvelope = {
    data: ParkingSessionCreateManyGarageInput | ParkingSessionCreateManyGarageInput[]
  }

  export type TicketCreateWithoutGarageInput = {
    id?: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    vehicle: VehicleCreateNestedOneWithoutTicketsInput
    session?: ParkingSessionCreateNestedOneWithoutTicketsInput
    payments?: PaymentCreateNestedManyWithoutTicketInput
  }

  export type TicketUncheckedCreateWithoutGarageInput = {
    id?: string
    vehicleId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    payments?: PaymentUncheckedCreateNestedManyWithoutTicketInput
  }

  export type TicketCreateOrConnectWithoutGarageInput = {
    where: TicketWhereUniqueInput
    create: XOR<TicketCreateWithoutGarageInput, TicketUncheckedCreateWithoutGarageInput>
  }

  export type TicketCreateManyGarageInputEnvelope = {
    data: TicketCreateManyGarageInput | TicketCreateManyGarageInput[]
  }

  export type PaymentCreateWithoutGarageInput = {
    id?: string
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    vehicle?: VehicleCreateNestedOneWithoutPaymentsInput
    session?: ParkingSessionCreateNestedOneWithoutPaymentsInput
    ticket?: TicketCreateNestedOneWithoutPaymentsInput
  }

  export type PaymentUncheckedCreateWithoutGarageInput = {
    id?: string
    vehicleId?: string | null
    sessionId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateOrConnectWithoutGarageInput = {
    where: PaymentWhereUniqueInput
    create: XOR<PaymentCreateWithoutGarageInput, PaymentUncheckedCreateWithoutGarageInput>
  }

  export type PaymentCreateManyGarageInputEnvelope = {
    data: PaymentCreateManyGarageInput | PaymentCreateManyGarageInput[]
  }

  export type FloorUpsertWithWhereUniqueWithoutGarageInput = {
    where: FloorWhereUniqueInput
    update: XOR<FloorUpdateWithoutGarageInput, FloorUncheckedUpdateWithoutGarageInput>
    create: XOR<FloorCreateWithoutGarageInput, FloorUncheckedCreateWithoutGarageInput>
  }

  export type FloorUpdateWithWhereUniqueWithoutGarageInput = {
    where: FloorWhereUniqueInput
    data: XOR<FloorUpdateWithoutGarageInput, FloorUncheckedUpdateWithoutGarageInput>
  }

  export type FloorUpdateManyWithWhereWithoutGarageInput = {
    where: FloorScalarWhereInput
    data: XOR<FloorUpdateManyMutationInput, FloorUncheckedUpdateManyWithoutGarageInput>
  }

  export type FloorScalarWhereInput = {
    AND?: FloorScalarWhereInput | FloorScalarWhereInput[]
    OR?: FloorScalarWhereInput[]
    NOT?: FloorScalarWhereInput | FloorScalarWhereInput[]
    id?: StringFilter<"Floor"> | string
    garageId?: StringFilter<"Floor"> | string
    number?: IntFilter<"Floor"> | number
    name?: StringNullableFilter<"Floor"> | string | null
    bays?: IntFilter<"Floor"> | number
    spotsPerBay?: IntFilter<"Floor"> | number
    isActive?: BoolFilter<"Floor"> | boolean
    createdAt?: DateTimeFilter<"Floor"> | Date | string
    updatedAt?: DateTimeFilter<"Floor"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Floor"> | Date | string | null
  }

  export type SpotUpsertWithWhereUniqueWithoutGarageInput = {
    where: SpotWhereUniqueInput
    update: XOR<SpotUpdateWithoutGarageInput, SpotUncheckedUpdateWithoutGarageInput>
    create: XOR<SpotCreateWithoutGarageInput, SpotUncheckedCreateWithoutGarageInput>
  }

  export type SpotUpdateWithWhereUniqueWithoutGarageInput = {
    where: SpotWhereUniqueInput
    data: XOR<SpotUpdateWithoutGarageInput, SpotUncheckedUpdateWithoutGarageInput>
  }

  export type SpotUpdateManyWithWhereWithoutGarageInput = {
    where: SpotScalarWhereInput
    data: XOR<SpotUpdateManyMutationInput, SpotUncheckedUpdateManyWithoutGarageInput>
  }

  export type SpotScalarWhereInput = {
    AND?: SpotScalarWhereInput | SpotScalarWhereInput[]
    OR?: SpotScalarWhereInput[]
    NOT?: SpotScalarWhereInput | SpotScalarWhereInput[]
    id?: StringFilter<"Spot"> | string
    garageId?: StringFilter<"Spot"> | string
    floorId?: StringNullableFilter<"Spot"> | string | null
    floor?: IntFilter<"Spot"> | number
    bay?: IntFilter<"Spot"> | number
    spotNumber?: StringFilter<"Spot"> | string
    type?: EnumSpotTypeFilter<"Spot"> | $Enums.SpotType
    status?: EnumSpotStatusFilter<"Spot"> | $Enums.SpotStatus
    features?: StringFilter<"Spot"> | string
    currentVehicleId?: StringNullableFilter<"Spot"> | string | null
    createdAt?: DateTimeFilter<"Spot"> | Date | string
    updatedAt?: DateTimeFilter<"Spot"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Spot"> | Date | string | null
  }

  export type ParkingSessionUpsertWithWhereUniqueWithoutGarageInput = {
    where: ParkingSessionWhereUniqueInput
    update: XOR<ParkingSessionUpdateWithoutGarageInput, ParkingSessionUncheckedUpdateWithoutGarageInput>
    create: XOR<ParkingSessionCreateWithoutGarageInput, ParkingSessionUncheckedCreateWithoutGarageInput>
  }

  export type ParkingSessionUpdateWithWhereUniqueWithoutGarageInput = {
    where: ParkingSessionWhereUniqueInput
    data: XOR<ParkingSessionUpdateWithoutGarageInput, ParkingSessionUncheckedUpdateWithoutGarageInput>
  }

  export type ParkingSessionUpdateManyWithWhereWithoutGarageInput = {
    where: ParkingSessionScalarWhereInput
    data: XOR<ParkingSessionUpdateManyMutationInput, ParkingSessionUncheckedUpdateManyWithoutGarageInput>
  }

  export type ParkingSessionScalarWhereInput = {
    AND?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
    OR?: ParkingSessionScalarWhereInput[]
    NOT?: ParkingSessionScalarWhereInput | ParkingSessionScalarWhereInput[]
    id?: StringFilter<"ParkingSession"> | string
    garageId?: StringFilter<"ParkingSession"> | string
    spotId?: StringFilter<"ParkingSession"> | string
    vehicleId?: StringFilter<"ParkingSession"> | string
    status?: EnumSessionStatusFilter<"ParkingSession"> | $Enums.SessionStatus
    rateType?: EnumRateTypeFilter<"ParkingSession"> | $Enums.RateType
    checkInTime?: DateTimeFilter<"ParkingSession"> | Date | string
    checkOutTime?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    expectedEndTime?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
    durationMinutes?: IntNullableFilter<"ParkingSession"> | number | null
    hourlyRate?: FloatNullableFilter<"ParkingSession"> | number | null
    totalAmount?: FloatFilter<"ParkingSession"> | number
    isPaid?: BoolFilter<"ParkingSession"> | boolean
    notes?: StringNullableFilter<"ParkingSession"> | string | null
    metadata?: StringNullableFilter<"ParkingSession"> | string | null
    endReason?: StringNullableFilter<"ParkingSession"> | string | null
    createdAt?: DateTimeFilter<"ParkingSession"> | Date | string
    updatedAt?: DateTimeFilter<"ParkingSession"> | Date | string
    deletedAt?: DateTimeNullableFilter<"ParkingSession"> | Date | string | null
  }

  export type TicketUpsertWithWhereUniqueWithoutGarageInput = {
    where: TicketWhereUniqueInput
    update: XOR<TicketUpdateWithoutGarageInput, TicketUncheckedUpdateWithoutGarageInput>
    create: XOR<TicketCreateWithoutGarageInput, TicketUncheckedCreateWithoutGarageInput>
  }

  export type TicketUpdateWithWhereUniqueWithoutGarageInput = {
    where: TicketWhereUniqueInput
    data: XOR<TicketUpdateWithoutGarageInput, TicketUncheckedUpdateWithoutGarageInput>
  }

  export type TicketUpdateManyWithWhereWithoutGarageInput = {
    where: TicketScalarWhereInput
    data: XOR<TicketUpdateManyMutationInput, TicketUncheckedUpdateManyWithoutGarageInput>
  }

  export type TicketScalarWhereInput = {
    AND?: TicketScalarWhereInput | TicketScalarWhereInput[]
    OR?: TicketScalarWhereInput[]
    NOT?: TicketScalarWhereInput | TicketScalarWhereInput[]
    id?: StringFilter<"Ticket"> | string
    garageId?: StringFilter<"Ticket"> | string
    vehicleId?: StringFilter<"Ticket"> | string
    sessionId?: StringNullableFilter<"Ticket"> | string | null
    ticketNumber?: StringFilter<"Ticket"> | string
    type?: EnumTicketTypeFilter<"Ticket"> | $Enums.TicketType
    status?: EnumTicketStatusFilter<"Ticket"> | $Enums.TicketStatus
    description?: StringFilter<"Ticket"> | string
    violationTime?: DateTimeFilter<"Ticket"> | Date | string
    location?: StringNullableFilter<"Ticket"> | string | null
    fineAmount?: FloatFilter<"Ticket"> | number
    isPaid?: BoolFilter<"Ticket"> | boolean
    paymentDueDate?: DateTimeNullableFilter<"Ticket"> | Date | string | null
    issuedBy?: StringNullableFilter<"Ticket"> | string | null
    createdAt?: DateTimeFilter<"Ticket"> | Date | string
    updatedAt?: DateTimeFilter<"Ticket"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Ticket"> | Date | string | null
  }

  export type PaymentUpsertWithWhereUniqueWithoutGarageInput = {
    where: PaymentWhereUniqueInput
    update: XOR<PaymentUpdateWithoutGarageInput, PaymentUncheckedUpdateWithoutGarageInput>
    create: XOR<PaymentCreateWithoutGarageInput, PaymentUncheckedCreateWithoutGarageInput>
  }

  export type PaymentUpdateWithWhereUniqueWithoutGarageInput = {
    where: PaymentWhereUniqueInput
    data: XOR<PaymentUpdateWithoutGarageInput, PaymentUncheckedUpdateWithoutGarageInput>
  }

  export type PaymentUpdateManyWithWhereWithoutGarageInput = {
    where: PaymentScalarWhereInput
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyWithoutGarageInput>
  }

  export type PaymentScalarWhereInput = {
    AND?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
    OR?: PaymentScalarWhereInput[]
    NOT?: PaymentScalarWhereInput | PaymentScalarWhereInput[]
    id?: StringFilter<"Payment"> | string
    garageId?: StringFilter<"Payment"> | string
    vehicleId?: StringNullableFilter<"Payment"> | string | null
    sessionId?: StringNullableFilter<"Payment"> | string | null
    ticketId?: StringNullableFilter<"Payment"> | string | null
    paymentNumber?: StringFilter<"Payment"> | string
    type?: EnumPaymentTypeFilter<"Payment"> | $Enums.PaymentType
    method?: EnumPaymentMethodFilter<"Payment"> | $Enums.PaymentMethod
    status?: EnumPaymentStatusFilter<"Payment"> | $Enums.PaymentStatus
    amount?: FloatFilter<"Payment"> | number
    currency?: StringFilter<"Payment"> | string
    transactionId?: StringNullableFilter<"Payment"> | string | null
    gatewayResponse?: StringNullableFilter<"Payment"> | string | null
    paymentDate?: DateTimeFilter<"Payment"> | Date | string
    processedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundAmount?: FloatFilter<"Payment"> | number
    refundDate?: DateTimeNullableFilter<"Payment"> | Date | string | null
    refundReason?: StringNullableFilter<"Payment"> | string | null
    createdAt?: DateTimeFilter<"Payment"> | Date | string
    updatedAt?: DateTimeFilter<"Payment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Payment"> | Date | string | null
  }

  export type GarageCreateWithoutFloorsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    spots?: SpotCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionCreateNestedManyWithoutGarageInput
    tickets?: TicketCreateNestedManyWithoutGarageInput
    payments?: PaymentCreateNestedManyWithoutGarageInput
  }

  export type GarageUncheckedCreateWithoutFloorsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    spots?: SpotUncheckedCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutGarageInput
    tickets?: TicketUncheckedCreateNestedManyWithoutGarageInput
    payments?: PaymentUncheckedCreateNestedManyWithoutGarageInput
  }

  export type GarageCreateOrConnectWithoutFloorsInput = {
    where: GarageWhereUniqueInput
    create: XOR<GarageCreateWithoutFloorsInput, GarageUncheckedCreateWithoutFloorsInput>
  }

  export type SpotCreateWithoutFloorRelInput = {
    id?: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSpotsInput
    currentVehicle?: VehicleCreateNestedOneWithoutCurrentSpotInput
    sessions?: ParkingSessionCreateNestedManyWithoutSpotInput
  }

  export type SpotUncheckedCreateWithoutFloorRelInput = {
    id?: string
    garageId: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutSpotInput
  }

  export type SpotCreateOrConnectWithoutFloorRelInput = {
    where: SpotWhereUniqueInput
    create: XOR<SpotCreateWithoutFloorRelInput, SpotUncheckedCreateWithoutFloorRelInput>
  }

  export type SpotCreateManyFloorRelInputEnvelope = {
    data: SpotCreateManyFloorRelInput | SpotCreateManyFloorRelInput[]
  }

  export type GarageUpsertWithoutFloorsInput = {
    update: XOR<GarageUpdateWithoutFloorsInput, GarageUncheckedUpdateWithoutFloorsInput>
    create: XOR<GarageCreateWithoutFloorsInput, GarageUncheckedCreateWithoutFloorsInput>
    where?: GarageWhereInput
  }

  export type GarageUpdateToOneWithWhereWithoutFloorsInput = {
    where?: GarageWhereInput
    data: XOR<GarageUpdateWithoutFloorsInput, GarageUncheckedUpdateWithoutFloorsInput>
  }

  export type GarageUpdateWithoutFloorsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    spots?: SpotUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUpdateManyWithoutGarageNestedInput
    tickets?: TicketUpdateManyWithoutGarageNestedInput
    payments?: PaymentUpdateManyWithoutGarageNestedInput
  }

  export type GarageUncheckedUpdateWithoutFloorsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    spots?: SpotUncheckedUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutGarageNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutGarageNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutGarageNestedInput
  }

  export type SpotUpsertWithWhereUniqueWithoutFloorRelInput = {
    where: SpotWhereUniqueInput
    update: XOR<SpotUpdateWithoutFloorRelInput, SpotUncheckedUpdateWithoutFloorRelInput>
    create: XOR<SpotCreateWithoutFloorRelInput, SpotUncheckedCreateWithoutFloorRelInput>
  }

  export type SpotUpdateWithWhereUniqueWithoutFloorRelInput = {
    where: SpotWhereUniqueInput
    data: XOR<SpotUpdateWithoutFloorRelInput, SpotUncheckedUpdateWithoutFloorRelInput>
  }

  export type SpotUpdateManyWithWhereWithoutFloorRelInput = {
    where: SpotScalarWhereInput
    data: XOR<SpotUpdateManyMutationInput, SpotUncheckedUpdateManyWithoutFloorRelInput>
  }

  export type GarageCreateWithoutSpotsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionCreateNestedManyWithoutGarageInput
    tickets?: TicketCreateNestedManyWithoutGarageInput
    payments?: PaymentCreateNestedManyWithoutGarageInput
  }

  export type GarageUncheckedCreateWithoutSpotsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorUncheckedCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutGarageInput
    tickets?: TicketUncheckedCreateNestedManyWithoutGarageInput
    payments?: PaymentUncheckedCreateNestedManyWithoutGarageInput
  }

  export type GarageCreateOrConnectWithoutSpotsInput = {
    where: GarageWhereUniqueInput
    create: XOR<GarageCreateWithoutSpotsInput, GarageUncheckedCreateWithoutSpotsInput>
  }

  export type FloorCreateWithoutSpotsInput = {
    id?: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutFloorsInput
  }

  export type FloorUncheckedCreateWithoutSpotsInput = {
    id?: string
    garageId: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type FloorCreateOrConnectWithoutSpotsInput = {
    where: FloorWhereUniqueInput
    create: XOR<FloorCreateWithoutSpotsInput, FloorUncheckedCreateWithoutSpotsInput>
  }

  export type VehicleCreateWithoutCurrentSpotInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    sessions?: ParkingSessionCreateNestedManyWithoutVehicleInput
    tickets?: TicketCreateNestedManyWithoutVehicleInput
    payments?: PaymentCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutCurrentSpotInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutVehicleInput
    tickets?: TicketUncheckedCreateNestedManyWithoutVehicleInput
    payments?: PaymentUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutCurrentSpotInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutCurrentSpotInput, VehicleUncheckedCreateWithoutCurrentSpotInput>
  }

  export type ParkingSessionCreateWithoutSpotInput = {
    id?: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSessionsInput
    vehicle: VehicleCreateNestedOneWithoutSessionsInput
    tickets?: TicketCreateNestedManyWithoutSessionInput
    payments?: PaymentCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUncheckedCreateWithoutSpotInput = {
    id?: string
    garageId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tickets?: TicketUncheckedCreateNestedManyWithoutSessionInput
    payments?: PaymentUncheckedCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionCreateOrConnectWithoutSpotInput = {
    where: ParkingSessionWhereUniqueInput
    create: XOR<ParkingSessionCreateWithoutSpotInput, ParkingSessionUncheckedCreateWithoutSpotInput>
  }

  export type ParkingSessionCreateManySpotInputEnvelope = {
    data: ParkingSessionCreateManySpotInput | ParkingSessionCreateManySpotInput[]
  }

  export type GarageUpsertWithoutSpotsInput = {
    update: XOR<GarageUpdateWithoutSpotsInput, GarageUncheckedUpdateWithoutSpotsInput>
    create: XOR<GarageCreateWithoutSpotsInput, GarageUncheckedCreateWithoutSpotsInput>
    where?: GarageWhereInput
  }

  export type GarageUpdateToOneWithWhereWithoutSpotsInput = {
    where?: GarageWhereInput
    data: XOR<GarageUpdateWithoutSpotsInput, GarageUncheckedUpdateWithoutSpotsInput>
  }

  export type GarageUpdateWithoutSpotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUpdateManyWithoutGarageNestedInput
    tickets?: TicketUpdateManyWithoutGarageNestedInput
    payments?: PaymentUpdateManyWithoutGarageNestedInput
  }

  export type GarageUncheckedUpdateWithoutSpotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUncheckedUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutGarageNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutGarageNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutGarageNestedInput
  }

  export type FloorUpsertWithoutSpotsInput = {
    update: XOR<FloorUpdateWithoutSpotsInput, FloorUncheckedUpdateWithoutSpotsInput>
    create: XOR<FloorCreateWithoutSpotsInput, FloorUncheckedCreateWithoutSpotsInput>
    where?: FloorWhereInput
  }

  export type FloorUpdateToOneWithWhereWithoutSpotsInput = {
    where?: FloorWhereInput
    data: XOR<FloorUpdateWithoutSpotsInput, FloorUncheckedUpdateWithoutSpotsInput>
  }

  export type FloorUpdateWithoutSpotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutFloorsNestedInput
  }

  export type FloorUncheckedUpdateWithoutSpotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type VehicleUpsertWithoutCurrentSpotInput = {
    update: XOR<VehicleUpdateWithoutCurrentSpotInput, VehicleUncheckedUpdateWithoutCurrentSpotInput>
    create: XOR<VehicleCreateWithoutCurrentSpotInput, VehicleUncheckedCreateWithoutCurrentSpotInput>
    where?: VehicleWhereInput
  }

  export type VehicleUpdateToOneWithWhereWithoutCurrentSpotInput = {
    where?: VehicleWhereInput
    data: XOR<VehicleUpdateWithoutCurrentSpotInput, VehicleUncheckedUpdateWithoutCurrentSpotInput>
  }

  export type VehicleUpdateWithoutCurrentSpotInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: ParkingSessionUpdateManyWithoutVehicleNestedInput
    tickets?: TicketUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutCurrentSpotInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: ParkingSessionUncheckedUpdateManyWithoutVehicleNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type ParkingSessionUpsertWithWhereUniqueWithoutSpotInput = {
    where: ParkingSessionWhereUniqueInput
    update: XOR<ParkingSessionUpdateWithoutSpotInput, ParkingSessionUncheckedUpdateWithoutSpotInput>
    create: XOR<ParkingSessionCreateWithoutSpotInput, ParkingSessionUncheckedCreateWithoutSpotInput>
  }

  export type ParkingSessionUpdateWithWhereUniqueWithoutSpotInput = {
    where: ParkingSessionWhereUniqueInput
    data: XOR<ParkingSessionUpdateWithoutSpotInput, ParkingSessionUncheckedUpdateWithoutSpotInput>
  }

  export type ParkingSessionUpdateManyWithWhereWithoutSpotInput = {
    where: ParkingSessionScalarWhereInput
    data: XOR<ParkingSessionUpdateManyMutationInput, ParkingSessionUncheckedUpdateManyWithoutSpotInput>
  }

  export type SpotCreateWithoutCurrentVehicleInput = {
    id?: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSpotsInput
    floorRel?: FloorCreateNestedOneWithoutSpotsInput
    sessions?: ParkingSessionCreateNestedManyWithoutSpotInput
  }

  export type SpotUncheckedCreateWithoutCurrentVehicleInput = {
    id?: string
    garageId: string
    floorId?: string | null
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutSpotInput
  }

  export type SpotCreateOrConnectWithoutCurrentVehicleInput = {
    where: SpotWhereUniqueInput
    create: XOR<SpotCreateWithoutCurrentVehicleInput, SpotUncheckedCreateWithoutCurrentVehicleInput>
  }

  export type ParkingSessionCreateWithoutVehicleInput = {
    id?: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSessionsInput
    spot: SpotCreateNestedOneWithoutSessionsInput
    tickets?: TicketCreateNestedManyWithoutSessionInput
    payments?: PaymentCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUncheckedCreateWithoutVehicleInput = {
    id?: string
    garageId: string
    spotId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tickets?: TicketUncheckedCreateNestedManyWithoutSessionInput
    payments?: PaymentUncheckedCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionCreateOrConnectWithoutVehicleInput = {
    where: ParkingSessionWhereUniqueInput
    create: XOR<ParkingSessionCreateWithoutVehicleInput, ParkingSessionUncheckedCreateWithoutVehicleInput>
  }

  export type ParkingSessionCreateManyVehicleInputEnvelope = {
    data: ParkingSessionCreateManyVehicleInput | ParkingSessionCreateManyVehicleInput[]
  }

  export type TicketCreateWithoutVehicleInput = {
    id?: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutTicketsInput
    session?: ParkingSessionCreateNestedOneWithoutTicketsInput
    payments?: PaymentCreateNestedManyWithoutTicketInput
  }

  export type TicketUncheckedCreateWithoutVehicleInput = {
    id?: string
    garageId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    payments?: PaymentUncheckedCreateNestedManyWithoutTicketInput
  }

  export type TicketCreateOrConnectWithoutVehicleInput = {
    where: TicketWhereUniqueInput
    create: XOR<TicketCreateWithoutVehicleInput, TicketUncheckedCreateWithoutVehicleInput>
  }

  export type TicketCreateManyVehicleInputEnvelope = {
    data: TicketCreateManyVehicleInput | TicketCreateManyVehicleInput[]
  }

  export type PaymentCreateWithoutVehicleInput = {
    id?: string
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutPaymentsInput
    session?: ParkingSessionCreateNestedOneWithoutPaymentsInput
    ticket?: TicketCreateNestedOneWithoutPaymentsInput
  }

  export type PaymentUncheckedCreateWithoutVehicleInput = {
    id?: string
    garageId: string
    sessionId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateOrConnectWithoutVehicleInput = {
    where: PaymentWhereUniqueInput
    create: XOR<PaymentCreateWithoutVehicleInput, PaymentUncheckedCreateWithoutVehicleInput>
  }

  export type PaymentCreateManyVehicleInputEnvelope = {
    data: PaymentCreateManyVehicleInput | PaymentCreateManyVehicleInput[]
  }

  export type SpotUpsertWithoutCurrentVehicleInput = {
    update: XOR<SpotUpdateWithoutCurrentVehicleInput, SpotUncheckedUpdateWithoutCurrentVehicleInput>
    create: XOR<SpotCreateWithoutCurrentVehicleInput, SpotUncheckedCreateWithoutCurrentVehicleInput>
    where?: SpotWhereInput
  }

  export type SpotUpdateToOneWithWhereWithoutCurrentVehicleInput = {
    where?: SpotWhereInput
    data: XOR<SpotUpdateWithoutCurrentVehicleInput, SpotUncheckedUpdateWithoutCurrentVehicleInput>
  }

  export type SpotUpdateWithoutCurrentVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSpotsNestedInput
    floorRel?: FloorUpdateOneWithoutSpotsNestedInput
    sessions?: ParkingSessionUpdateManyWithoutSpotNestedInput
  }

  export type SpotUncheckedUpdateWithoutCurrentVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    floorId?: NullableStringFieldUpdateOperationsInput | string | null
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: ParkingSessionUncheckedUpdateManyWithoutSpotNestedInput
  }

  export type ParkingSessionUpsertWithWhereUniqueWithoutVehicleInput = {
    where: ParkingSessionWhereUniqueInput
    update: XOR<ParkingSessionUpdateWithoutVehicleInput, ParkingSessionUncheckedUpdateWithoutVehicleInput>
    create: XOR<ParkingSessionCreateWithoutVehicleInput, ParkingSessionUncheckedCreateWithoutVehicleInput>
  }

  export type ParkingSessionUpdateWithWhereUniqueWithoutVehicleInput = {
    where: ParkingSessionWhereUniqueInput
    data: XOR<ParkingSessionUpdateWithoutVehicleInput, ParkingSessionUncheckedUpdateWithoutVehicleInput>
  }

  export type ParkingSessionUpdateManyWithWhereWithoutVehicleInput = {
    where: ParkingSessionScalarWhereInput
    data: XOR<ParkingSessionUpdateManyMutationInput, ParkingSessionUncheckedUpdateManyWithoutVehicleInput>
  }

  export type TicketUpsertWithWhereUniqueWithoutVehicleInput = {
    where: TicketWhereUniqueInput
    update: XOR<TicketUpdateWithoutVehicleInput, TicketUncheckedUpdateWithoutVehicleInput>
    create: XOR<TicketCreateWithoutVehicleInput, TicketUncheckedCreateWithoutVehicleInput>
  }

  export type TicketUpdateWithWhereUniqueWithoutVehicleInput = {
    where: TicketWhereUniqueInput
    data: XOR<TicketUpdateWithoutVehicleInput, TicketUncheckedUpdateWithoutVehicleInput>
  }

  export type TicketUpdateManyWithWhereWithoutVehicleInput = {
    where: TicketScalarWhereInput
    data: XOR<TicketUpdateManyMutationInput, TicketUncheckedUpdateManyWithoutVehicleInput>
  }

  export type PaymentUpsertWithWhereUniqueWithoutVehicleInput = {
    where: PaymentWhereUniqueInput
    update: XOR<PaymentUpdateWithoutVehicleInput, PaymentUncheckedUpdateWithoutVehicleInput>
    create: XOR<PaymentCreateWithoutVehicleInput, PaymentUncheckedCreateWithoutVehicleInput>
  }

  export type PaymentUpdateWithWhereUniqueWithoutVehicleInput = {
    where: PaymentWhereUniqueInput
    data: XOR<PaymentUpdateWithoutVehicleInput, PaymentUncheckedUpdateWithoutVehicleInput>
  }

  export type PaymentUpdateManyWithWhereWithoutVehicleInput = {
    where: PaymentScalarWhereInput
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyWithoutVehicleInput>
  }

  export type GarageCreateWithoutSessionsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorCreateNestedManyWithoutGarageInput
    spots?: SpotCreateNestedManyWithoutGarageInput
    tickets?: TicketCreateNestedManyWithoutGarageInput
    payments?: PaymentCreateNestedManyWithoutGarageInput
  }

  export type GarageUncheckedCreateWithoutSessionsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorUncheckedCreateNestedManyWithoutGarageInput
    spots?: SpotUncheckedCreateNestedManyWithoutGarageInput
    tickets?: TicketUncheckedCreateNestedManyWithoutGarageInput
    payments?: PaymentUncheckedCreateNestedManyWithoutGarageInput
  }

  export type GarageCreateOrConnectWithoutSessionsInput = {
    where: GarageWhereUniqueInput
    create: XOR<GarageCreateWithoutSessionsInput, GarageUncheckedCreateWithoutSessionsInput>
  }

  export type SpotCreateWithoutSessionsInput = {
    id?: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSpotsInput
    floorRel?: FloorCreateNestedOneWithoutSpotsInput
    currentVehicle?: VehicleCreateNestedOneWithoutCurrentSpotInput
  }

  export type SpotUncheckedCreateWithoutSessionsInput = {
    id?: string
    garageId: string
    floorId?: string | null
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type SpotCreateOrConnectWithoutSessionsInput = {
    where: SpotWhereUniqueInput
    create: XOR<SpotCreateWithoutSessionsInput, SpotUncheckedCreateWithoutSessionsInput>
  }

  export type VehicleCreateWithoutSessionsInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotCreateNestedOneWithoutCurrentVehicleInput
    tickets?: TicketCreateNestedManyWithoutVehicleInput
    payments?: PaymentCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutSessionsInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotUncheckedCreateNestedOneWithoutCurrentVehicleInput
    tickets?: TicketUncheckedCreateNestedManyWithoutVehicleInput
    payments?: PaymentUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutSessionsInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutSessionsInput, VehicleUncheckedCreateWithoutSessionsInput>
  }

  export type TicketCreateWithoutSessionInput = {
    id?: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutTicketsInput
    vehicle: VehicleCreateNestedOneWithoutTicketsInput
    payments?: PaymentCreateNestedManyWithoutTicketInput
  }

  export type TicketUncheckedCreateWithoutSessionInput = {
    id?: string
    garageId: string
    vehicleId: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    payments?: PaymentUncheckedCreateNestedManyWithoutTicketInput
  }

  export type TicketCreateOrConnectWithoutSessionInput = {
    where: TicketWhereUniqueInput
    create: XOR<TicketCreateWithoutSessionInput, TicketUncheckedCreateWithoutSessionInput>
  }

  export type TicketCreateManySessionInputEnvelope = {
    data: TicketCreateManySessionInput | TicketCreateManySessionInput[]
  }

  export type PaymentCreateWithoutSessionInput = {
    id?: string
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutPaymentsInput
    vehicle?: VehicleCreateNestedOneWithoutPaymentsInput
    ticket?: TicketCreateNestedOneWithoutPaymentsInput
  }

  export type PaymentUncheckedCreateWithoutSessionInput = {
    id?: string
    garageId: string
    vehicleId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateOrConnectWithoutSessionInput = {
    where: PaymentWhereUniqueInput
    create: XOR<PaymentCreateWithoutSessionInput, PaymentUncheckedCreateWithoutSessionInput>
  }

  export type PaymentCreateManySessionInputEnvelope = {
    data: PaymentCreateManySessionInput | PaymentCreateManySessionInput[]
  }

  export type GarageUpsertWithoutSessionsInput = {
    update: XOR<GarageUpdateWithoutSessionsInput, GarageUncheckedUpdateWithoutSessionsInput>
    create: XOR<GarageCreateWithoutSessionsInput, GarageUncheckedCreateWithoutSessionsInput>
    where?: GarageWhereInput
  }

  export type GarageUpdateToOneWithWhereWithoutSessionsInput = {
    where?: GarageWhereInput
    data: XOR<GarageUpdateWithoutSessionsInput, GarageUncheckedUpdateWithoutSessionsInput>
  }

  export type GarageUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUpdateManyWithoutGarageNestedInput
    spots?: SpotUpdateManyWithoutGarageNestedInput
    tickets?: TicketUpdateManyWithoutGarageNestedInput
    payments?: PaymentUpdateManyWithoutGarageNestedInput
  }

  export type GarageUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUncheckedUpdateManyWithoutGarageNestedInput
    spots?: SpotUncheckedUpdateManyWithoutGarageNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutGarageNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutGarageNestedInput
  }

  export type SpotUpsertWithoutSessionsInput = {
    update: XOR<SpotUpdateWithoutSessionsInput, SpotUncheckedUpdateWithoutSessionsInput>
    create: XOR<SpotCreateWithoutSessionsInput, SpotUncheckedCreateWithoutSessionsInput>
    where?: SpotWhereInput
  }

  export type SpotUpdateToOneWithWhereWithoutSessionsInput = {
    where?: SpotWhereInput
    data: XOR<SpotUpdateWithoutSessionsInput, SpotUncheckedUpdateWithoutSessionsInput>
  }

  export type SpotUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSpotsNestedInput
    floorRel?: FloorUpdateOneWithoutSpotsNestedInput
    currentVehicle?: VehicleUpdateOneWithoutCurrentSpotNestedInput
  }

  export type SpotUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    floorId?: NullableStringFieldUpdateOperationsInput | string | null
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type VehicleUpsertWithoutSessionsInput = {
    update: XOR<VehicleUpdateWithoutSessionsInput, VehicleUncheckedUpdateWithoutSessionsInput>
    create: XOR<VehicleCreateWithoutSessionsInput, VehicleUncheckedCreateWithoutSessionsInput>
    where?: VehicleWhereInput
  }

  export type VehicleUpdateToOneWithWhereWithoutSessionsInput = {
    where?: VehicleWhereInput
    data: XOR<VehicleUpdateWithoutSessionsInput, VehicleUncheckedUpdateWithoutSessionsInput>
  }

  export type VehicleUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUpdateOneWithoutCurrentVehicleNestedInput
    tickets?: TicketUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUncheckedUpdateOneWithoutCurrentVehicleNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type TicketUpsertWithWhereUniqueWithoutSessionInput = {
    where: TicketWhereUniqueInput
    update: XOR<TicketUpdateWithoutSessionInput, TicketUncheckedUpdateWithoutSessionInput>
    create: XOR<TicketCreateWithoutSessionInput, TicketUncheckedCreateWithoutSessionInput>
  }

  export type TicketUpdateWithWhereUniqueWithoutSessionInput = {
    where: TicketWhereUniqueInput
    data: XOR<TicketUpdateWithoutSessionInput, TicketUncheckedUpdateWithoutSessionInput>
  }

  export type TicketUpdateManyWithWhereWithoutSessionInput = {
    where: TicketScalarWhereInput
    data: XOR<TicketUpdateManyMutationInput, TicketUncheckedUpdateManyWithoutSessionInput>
  }

  export type PaymentUpsertWithWhereUniqueWithoutSessionInput = {
    where: PaymentWhereUniqueInput
    update: XOR<PaymentUpdateWithoutSessionInput, PaymentUncheckedUpdateWithoutSessionInput>
    create: XOR<PaymentCreateWithoutSessionInput, PaymentUncheckedCreateWithoutSessionInput>
  }

  export type PaymentUpdateWithWhereUniqueWithoutSessionInput = {
    where: PaymentWhereUniqueInput
    data: XOR<PaymentUpdateWithoutSessionInput, PaymentUncheckedUpdateWithoutSessionInput>
  }

  export type PaymentUpdateManyWithWhereWithoutSessionInput = {
    where: PaymentScalarWhereInput
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyWithoutSessionInput>
  }

  export type GarageCreateWithoutTicketsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorCreateNestedManyWithoutGarageInput
    spots?: SpotCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionCreateNestedManyWithoutGarageInput
    payments?: PaymentCreateNestedManyWithoutGarageInput
  }

  export type GarageUncheckedCreateWithoutTicketsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorUncheckedCreateNestedManyWithoutGarageInput
    spots?: SpotUncheckedCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutGarageInput
    payments?: PaymentUncheckedCreateNestedManyWithoutGarageInput
  }

  export type GarageCreateOrConnectWithoutTicketsInput = {
    where: GarageWhereUniqueInput
    create: XOR<GarageCreateWithoutTicketsInput, GarageUncheckedCreateWithoutTicketsInput>
  }

  export type VehicleCreateWithoutTicketsInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotCreateNestedOneWithoutCurrentVehicleInput
    sessions?: ParkingSessionCreateNestedManyWithoutVehicleInput
    payments?: PaymentCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutTicketsInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotUncheckedCreateNestedOneWithoutCurrentVehicleInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutVehicleInput
    payments?: PaymentUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutTicketsInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutTicketsInput, VehicleUncheckedCreateWithoutTicketsInput>
  }

  export type ParkingSessionCreateWithoutTicketsInput = {
    id?: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSessionsInput
    spot: SpotCreateNestedOneWithoutSessionsInput
    vehicle: VehicleCreateNestedOneWithoutSessionsInput
    payments?: PaymentCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUncheckedCreateWithoutTicketsInput = {
    id?: string
    garageId: string
    spotId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    payments?: PaymentUncheckedCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionCreateOrConnectWithoutTicketsInput = {
    where: ParkingSessionWhereUniqueInput
    create: XOR<ParkingSessionCreateWithoutTicketsInput, ParkingSessionUncheckedCreateWithoutTicketsInput>
  }

  export type PaymentCreateWithoutTicketInput = {
    id?: string
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutPaymentsInput
    vehicle?: VehicleCreateNestedOneWithoutPaymentsInput
    session?: ParkingSessionCreateNestedOneWithoutPaymentsInput
  }

  export type PaymentUncheckedCreateWithoutTicketInput = {
    id?: string
    garageId: string
    vehicleId?: string | null
    sessionId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateOrConnectWithoutTicketInput = {
    where: PaymentWhereUniqueInput
    create: XOR<PaymentCreateWithoutTicketInput, PaymentUncheckedCreateWithoutTicketInput>
  }

  export type PaymentCreateManyTicketInputEnvelope = {
    data: PaymentCreateManyTicketInput | PaymentCreateManyTicketInput[]
  }

  export type GarageUpsertWithoutTicketsInput = {
    update: XOR<GarageUpdateWithoutTicketsInput, GarageUncheckedUpdateWithoutTicketsInput>
    create: XOR<GarageCreateWithoutTicketsInput, GarageUncheckedCreateWithoutTicketsInput>
    where?: GarageWhereInput
  }

  export type GarageUpdateToOneWithWhereWithoutTicketsInput = {
    where?: GarageWhereInput
    data: XOR<GarageUpdateWithoutTicketsInput, GarageUncheckedUpdateWithoutTicketsInput>
  }

  export type GarageUpdateWithoutTicketsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUpdateManyWithoutGarageNestedInput
    spots?: SpotUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUpdateManyWithoutGarageNestedInput
    payments?: PaymentUpdateManyWithoutGarageNestedInput
  }

  export type GarageUncheckedUpdateWithoutTicketsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUncheckedUpdateManyWithoutGarageNestedInput
    spots?: SpotUncheckedUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutGarageNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutGarageNestedInput
  }

  export type VehicleUpsertWithoutTicketsInput = {
    update: XOR<VehicleUpdateWithoutTicketsInput, VehicleUncheckedUpdateWithoutTicketsInput>
    create: XOR<VehicleCreateWithoutTicketsInput, VehicleUncheckedCreateWithoutTicketsInput>
    where?: VehicleWhereInput
  }

  export type VehicleUpdateToOneWithWhereWithoutTicketsInput = {
    where?: VehicleWhereInput
    data: XOR<VehicleUpdateWithoutTicketsInput, VehicleUncheckedUpdateWithoutTicketsInput>
  }

  export type VehicleUpdateWithoutTicketsInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUpdateOneWithoutCurrentVehicleNestedInput
    sessions?: ParkingSessionUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutTicketsInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUncheckedUpdateOneWithoutCurrentVehicleNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutVehicleNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type ParkingSessionUpsertWithoutTicketsInput = {
    update: XOR<ParkingSessionUpdateWithoutTicketsInput, ParkingSessionUncheckedUpdateWithoutTicketsInput>
    create: XOR<ParkingSessionCreateWithoutTicketsInput, ParkingSessionUncheckedCreateWithoutTicketsInput>
    where?: ParkingSessionWhereInput
  }

  export type ParkingSessionUpdateToOneWithWhereWithoutTicketsInput = {
    where?: ParkingSessionWhereInput
    data: XOR<ParkingSessionUpdateWithoutTicketsInput, ParkingSessionUncheckedUpdateWithoutTicketsInput>
  }

  export type ParkingSessionUpdateWithoutTicketsInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSessionsNestedInput
    spot?: SpotUpdateOneRequiredWithoutSessionsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutSessionsNestedInput
    payments?: PaymentUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateWithoutTicketsInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    payments?: PaymentUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type PaymentUpsertWithWhereUniqueWithoutTicketInput = {
    where: PaymentWhereUniqueInput
    update: XOR<PaymentUpdateWithoutTicketInput, PaymentUncheckedUpdateWithoutTicketInput>
    create: XOR<PaymentCreateWithoutTicketInput, PaymentUncheckedCreateWithoutTicketInput>
  }

  export type PaymentUpdateWithWhereUniqueWithoutTicketInput = {
    where: PaymentWhereUniqueInput
    data: XOR<PaymentUpdateWithoutTicketInput, PaymentUncheckedUpdateWithoutTicketInput>
  }

  export type PaymentUpdateManyWithWhereWithoutTicketInput = {
    where: PaymentScalarWhereInput
    data: XOR<PaymentUpdateManyMutationInput, PaymentUncheckedUpdateManyWithoutTicketInput>
  }

  export type GarageCreateWithoutPaymentsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorCreateNestedManyWithoutGarageInput
    spots?: SpotCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionCreateNestedManyWithoutGarageInput
    tickets?: TicketCreateNestedManyWithoutGarageInput
  }

  export type GarageUncheckedCreateWithoutPaymentsInput = {
    id?: string
    name: string
    description?: string | null
    totalFloors?: number
    totalSpots?: number
    isActive?: boolean
    operatingHours?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    floors?: FloorUncheckedCreateNestedManyWithoutGarageInput
    spots?: SpotUncheckedCreateNestedManyWithoutGarageInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutGarageInput
    tickets?: TicketUncheckedCreateNestedManyWithoutGarageInput
  }

  export type GarageCreateOrConnectWithoutPaymentsInput = {
    where: GarageWhereUniqueInput
    create: XOR<GarageCreateWithoutPaymentsInput, GarageUncheckedCreateWithoutPaymentsInput>
  }

  export type VehicleCreateWithoutPaymentsInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotCreateNestedOneWithoutCurrentVehicleInput
    sessions?: ParkingSessionCreateNestedManyWithoutVehicleInput
    tickets?: TicketCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutPaymentsInput = {
    id?: string
    licensePlate: string
    vehicleType?: $Enums.VehicleType
    make?: string | null
    model?: string | null
    color?: string | null
    year?: number | null
    ownerName?: string | null
    ownerEmail?: string | null
    ownerPhone?: string | null
    status?: $Enums.VehicleStatus
    currentSpotId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    currentSpot?: SpotUncheckedCreateNestedOneWithoutCurrentVehicleInput
    sessions?: ParkingSessionUncheckedCreateNestedManyWithoutVehicleInput
    tickets?: TicketUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutPaymentsInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutPaymentsInput, VehicleUncheckedCreateWithoutPaymentsInput>
  }

  export type ParkingSessionCreateWithoutPaymentsInput = {
    id?: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutSessionsInput
    spot: SpotCreateNestedOneWithoutSessionsInput
    vehicle: VehicleCreateNestedOneWithoutSessionsInput
    tickets?: TicketCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionUncheckedCreateWithoutPaymentsInput = {
    id?: string
    garageId: string
    spotId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    tickets?: TicketUncheckedCreateNestedManyWithoutSessionInput
  }

  export type ParkingSessionCreateOrConnectWithoutPaymentsInput = {
    where: ParkingSessionWhereUniqueInput
    create: XOR<ParkingSessionCreateWithoutPaymentsInput, ParkingSessionUncheckedCreateWithoutPaymentsInput>
  }

  export type TicketCreateWithoutPaymentsInput = {
    id?: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    garage: GarageCreateNestedOneWithoutTicketsInput
    vehicle: VehicleCreateNestedOneWithoutTicketsInput
    session?: ParkingSessionCreateNestedOneWithoutTicketsInput
  }

  export type TicketUncheckedCreateWithoutPaymentsInput = {
    id?: string
    garageId: string
    vehicleId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TicketCreateOrConnectWithoutPaymentsInput = {
    where: TicketWhereUniqueInput
    create: XOR<TicketCreateWithoutPaymentsInput, TicketUncheckedCreateWithoutPaymentsInput>
  }

  export type GarageUpsertWithoutPaymentsInput = {
    update: XOR<GarageUpdateWithoutPaymentsInput, GarageUncheckedUpdateWithoutPaymentsInput>
    create: XOR<GarageCreateWithoutPaymentsInput, GarageUncheckedCreateWithoutPaymentsInput>
    where?: GarageWhereInput
  }

  export type GarageUpdateToOneWithWhereWithoutPaymentsInput = {
    where?: GarageWhereInput
    data: XOR<GarageUpdateWithoutPaymentsInput, GarageUncheckedUpdateWithoutPaymentsInput>
  }

  export type GarageUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUpdateManyWithoutGarageNestedInput
    spots?: SpotUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUpdateManyWithoutGarageNestedInput
    tickets?: TicketUpdateManyWithoutGarageNestedInput
  }

  export type GarageUncheckedUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    totalFloors?: IntFieldUpdateOperationsInput | number
    totalSpots?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    operatingHours?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floors?: FloorUncheckedUpdateManyWithoutGarageNestedInput
    spots?: SpotUncheckedUpdateManyWithoutGarageNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutGarageNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutGarageNestedInput
  }

  export type VehicleUpsertWithoutPaymentsInput = {
    update: XOR<VehicleUpdateWithoutPaymentsInput, VehicleUncheckedUpdateWithoutPaymentsInput>
    create: XOR<VehicleCreateWithoutPaymentsInput, VehicleUncheckedCreateWithoutPaymentsInput>
    where?: VehicleWhereInput
  }

  export type VehicleUpdateToOneWithWhereWithoutPaymentsInput = {
    where?: VehicleWhereInput
    data: XOR<VehicleUpdateWithoutPaymentsInput, VehicleUncheckedUpdateWithoutPaymentsInput>
  }

  export type VehicleUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUpdateOneWithoutCurrentVehicleNestedInput
    sessions?: ParkingSessionUpdateManyWithoutVehicleNestedInput
    tickets?: TicketUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    licensePlate?: StringFieldUpdateOperationsInput | string
    vehicleType?: EnumVehicleTypeFieldUpdateOperationsInput | $Enums.VehicleType
    make?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    year?: NullableIntFieldUpdateOperationsInput | number | null
    ownerName?: NullableStringFieldUpdateOperationsInput | string | null
    ownerEmail?: NullableStringFieldUpdateOperationsInput | string | null
    ownerPhone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumVehicleStatusFieldUpdateOperationsInput | $Enums.VehicleStatus
    currentSpotId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    currentSpot?: SpotUncheckedUpdateOneWithoutCurrentVehicleNestedInput
    sessions?: ParkingSessionUncheckedUpdateManyWithoutVehicleNestedInput
    tickets?: TicketUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type ParkingSessionUpsertWithoutPaymentsInput = {
    update: XOR<ParkingSessionUpdateWithoutPaymentsInput, ParkingSessionUncheckedUpdateWithoutPaymentsInput>
    create: XOR<ParkingSessionCreateWithoutPaymentsInput, ParkingSessionUncheckedCreateWithoutPaymentsInput>
    where?: ParkingSessionWhereInput
  }

  export type ParkingSessionUpdateToOneWithWhereWithoutPaymentsInput = {
    where?: ParkingSessionWhereInput
    data: XOR<ParkingSessionUpdateWithoutPaymentsInput, ParkingSessionUncheckedUpdateWithoutPaymentsInput>
  }

  export type ParkingSessionUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSessionsNestedInput
    spot?: SpotUpdateOneRequiredWithoutSessionsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutSessionsNestedInput
    tickets?: TicketUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tickets?: TicketUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type TicketUpsertWithoutPaymentsInput = {
    update: XOR<TicketUpdateWithoutPaymentsInput, TicketUncheckedUpdateWithoutPaymentsInput>
    create: XOR<TicketCreateWithoutPaymentsInput, TicketUncheckedCreateWithoutPaymentsInput>
    where?: TicketWhereInput
  }

  export type TicketUpdateToOneWithWhereWithoutPaymentsInput = {
    where?: TicketWhereInput
    data: XOR<TicketUpdateWithoutPaymentsInput, TicketUncheckedUpdateWithoutPaymentsInput>
  }

  export type TicketUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutTicketsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutTicketsNestedInput
    session?: ParkingSessionUpdateOneWithoutTicketsNestedInput
  }

  export type TicketUncheckedUpdateWithoutPaymentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FloorCreateManyGarageInput = {
    id?: string
    number: number
    name?: string | null
    bays?: number
    spotsPerBay?: number
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type SpotCreateManyGarageInput = {
    id?: string
    floorId?: string | null
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ParkingSessionCreateManyGarageInput = {
    id?: string
    spotId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TicketCreateManyGarageInput = {
    id?: string
    vehicleId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateManyGarageInput = {
    id?: string
    vehicleId?: string | null
    sessionId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type FloorUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    spots?: SpotUpdateManyWithoutFloorRelNestedInput
  }

  export type FloorUncheckedUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    spots?: SpotUncheckedUpdateManyWithoutFloorRelNestedInput
  }

  export type FloorUncheckedUpdateManyWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    number?: IntFieldUpdateOperationsInput | number
    name?: NullableStringFieldUpdateOperationsInput | string | null
    bays?: IntFieldUpdateOperationsInput | number
    spotsPerBay?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SpotUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    floorRel?: FloorUpdateOneWithoutSpotsNestedInput
    currentVehicle?: VehicleUpdateOneWithoutCurrentSpotNestedInput
    sessions?: ParkingSessionUpdateManyWithoutSpotNestedInput
  }

  export type SpotUncheckedUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    floorId?: NullableStringFieldUpdateOperationsInput | string | null
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: ParkingSessionUncheckedUpdateManyWithoutSpotNestedInput
  }

  export type SpotUncheckedUpdateManyWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    floorId?: NullableStringFieldUpdateOperationsInput | string | null
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParkingSessionUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    spot?: SpotUpdateOneRequiredWithoutSessionsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutSessionsNestedInput
    tickets?: TicketUpdateManyWithoutSessionNestedInput
    payments?: PaymentUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tickets?: TicketUncheckedUpdateManyWithoutSessionNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateManyWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TicketUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    vehicle?: VehicleUpdateOneRequiredWithoutTicketsNestedInput
    session?: ParkingSessionUpdateOneWithoutTicketsNestedInput
    payments?: PaymentUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    payments?: PaymentUncheckedUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateManyWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    vehicle?: VehicleUpdateOneWithoutPaymentsNestedInput
    session?: ParkingSessionUpdateOneWithoutPaymentsNestedInput
    ticket?: TicketUpdateOneWithoutPaymentsNestedInput
  }

  export type PaymentUncheckedUpdateWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUncheckedUpdateManyWithoutGarageInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SpotCreateManyFloorRelInput = {
    id?: string
    garageId: string
    floor?: number
    bay?: number
    spotNumber: string
    type?: $Enums.SpotType
    status?: $Enums.SpotStatus
    features?: string
    currentVehicleId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type SpotUpdateWithoutFloorRelInput = {
    id?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSpotsNestedInput
    currentVehicle?: VehicleUpdateOneWithoutCurrentSpotNestedInput
    sessions?: ParkingSessionUpdateManyWithoutSpotNestedInput
  }

  export type SpotUncheckedUpdateWithoutFloorRelInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: ParkingSessionUncheckedUpdateManyWithoutSpotNestedInput
  }

  export type SpotUncheckedUpdateManyWithoutFloorRelInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    floor?: IntFieldUpdateOperationsInput | number
    bay?: IntFieldUpdateOperationsInput | number
    spotNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumSpotTypeFieldUpdateOperationsInput | $Enums.SpotType
    status?: EnumSpotStatusFieldUpdateOperationsInput | $Enums.SpotStatus
    features?: StringFieldUpdateOperationsInput | string
    currentVehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParkingSessionCreateManySpotInput = {
    id?: string
    garageId: string
    vehicleId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ParkingSessionUpdateWithoutSpotInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSessionsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutSessionsNestedInput
    tickets?: TicketUpdateManyWithoutSessionNestedInput
    payments?: PaymentUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateWithoutSpotInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tickets?: TicketUncheckedUpdateManyWithoutSessionNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateManyWithoutSpotInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParkingSessionCreateManyVehicleInput = {
    id?: string
    garageId: string
    spotId: string
    status?: $Enums.SessionStatus
    rateType?: $Enums.RateType
    checkInTime: Date | string
    checkOutTime?: Date | string | null
    expectedEndTime?: Date | string | null
    durationMinutes?: number | null
    hourlyRate?: number | null
    totalAmount?: number
    isPaid?: boolean
    notes?: string | null
    metadata?: string | null
    endReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TicketCreateManyVehicleInput = {
    id?: string
    garageId: string
    sessionId?: string | null
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateManyVehicleInput = {
    id?: string
    garageId: string
    sessionId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ParkingSessionUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutSessionsNestedInput
    spot?: SpotUpdateOneRequiredWithoutSessionsNestedInput
    tickets?: TicketUpdateManyWithoutSessionNestedInput
    payments?: PaymentUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tickets?: TicketUncheckedUpdateManyWithoutSessionNestedInput
    payments?: PaymentUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type ParkingSessionUncheckedUpdateManyWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    spotId?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    rateType?: EnumRateTypeFieldUpdateOperationsInput | $Enums.RateType
    checkInTime?: DateTimeFieldUpdateOperationsInput | Date | string
    checkOutTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expectedEndTime?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    durationMinutes?: NullableIntFieldUpdateOperationsInput | number | null
    hourlyRate?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    endReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TicketUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutTicketsNestedInput
    session?: ParkingSessionUpdateOneWithoutTicketsNestedInput
    payments?: PaymentUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    payments?: PaymentUncheckedUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateManyWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutPaymentsNestedInput
    session?: ParkingSessionUpdateOneWithoutPaymentsNestedInput
    ticket?: TicketUpdateOneWithoutPaymentsNestedInput
  }

  export type PaymentUncheckedUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUncheckedUpdateManyWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TicketCreateManySessionInput = {
    id?: string
    garageId: string
    vehicleId: string
    ticketNumber: string
    type?: $Enums.TicketType
    status?: $Enums.TicketStatus
    description: string
    violationTime: Date | string
    location?: string | null
    fineAmount?: number
    isPaid?: boolean
    paymentDueDate?: Date | string | null
    issuedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentCreateManySessionInput = {
    id?: string
    garageId: string
    vehicleId?: string | null
    ticketId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type TicketUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutTicketsNestedInput
    vehicle?: VehicleUpdateOneRequiredWithoutTicketsNestedInput
    payments?: PaymentUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    payments?: PaymentUncheckedUpdateManyWithoutTicketNestedInput
  }

  export type TicketUncheckedUpdateManyWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: StringFieldUpdateOperationsInput | string
    ticketNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumTicketTypeFieldUpdateOperationsInput | $Enums.TicketType
    status?: EnumTicketStatusFieldUpdateOperationsInput | $Enums.TicketStatus
    description?: StringFieldUpdateOperationsInput | string
    violationTime?: DateTimeFieldUpdateOperationsInput | Date | string
    location?: NullableStringFieldUpdateOperationsInput | string | null
    fineAmount?: FloatFieldUpdateOperationsInput | number
    isPaid?: BoolFieldUpdateOperationsInput | boolean
    paymentDueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    issuedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutPaymentsNestedInput
    vehicle?: VehicleUpdateOneWithoutPaymentsNestedInput
    ticket?: TicketUpdateOneWithoutPaymentsNestedInput
  }

  export type PaymentUncheckedUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUncheckedUpdateManyWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    ticketId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentCreateManyTicketInput = {
    id?: string
    garageId: string
    vehicleId?: string | null
    sessionId?: string | null
    paymentNumber: string
    type?: $Enums.PaymentType
    method?: $Enums.PaymentMethod
    status?: $Enums.PaymentStatus
    amount: number
    currency?: string
    transactionId?: string | null
    gatewayResponse?: string | null
    paymentDate: Date | string
    processedAt?: Date | string | null
    refundAmount?: number
    refundDate?: Date | string | null
    refundReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type PaymentUpdateWithoutTicketInput = {
    id?: StringFieldUpdateOperationsInput | string
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    garage?: GarageUpdateOneRequiredWithoutPaymentsNestedInput
    vehicle?: VehicleUpdateOneWithoutPaymentsNestedInput
    session?: ParkingSessionUpdateOneWithoutPaymentsNestedInput
  }

  export type PaymentUncheckedUpdateWithoutTicketInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PaymentUncheckedUpdateManyWithoutTicketInput = {
    id?: StringFieldUpdateOperationsInput | string
    garageId?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentNumber?: StringFieldUpdateOperationsInput | string
    type?: EnumPaymentTypeFieldUpdateOperationsInput | $Enums.PaymentType
    method?: EnumPaymentMethodFieldUpdateOperationsInput | $Enums.PaymentMethod
    status?: EnumPaymentStatusFieldUpdateOperationsInput | $Enums.PaymentStatus
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    transactionId?: NullableStringFieldUpdateOperationsInput | string | null
    gatewayResponse?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundAmount?: FloatFieldUpdateOperationsInput | number
    refundDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refundReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}