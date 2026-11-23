import React, { useEffect, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import usePost from "@/hooks/usePost";
import useUpdate from "@/hooks/useUpdate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Save, Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


/** Always returns a plain string so an object/array API error can never be rendered into JSX. */
const getErrorMessage = (err) => {
  const data = err?.response?.data;
  const raw = data?.message ?? data?.error ?? data?.data?.message ?? err?.message;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "string" ? x : x?.message ?? JSON.stringify(x)))
      .join(", ");
  }
  if (raw && typeof raw === "object") {
    return (
      raw.message ||
      Object.values(raw).flat().map(String).join(", ") ||
      "Something went wrong."
    );
  }
  return "Something went wrong. Please try again.";
};

/** Combobox as a real component, so its hooks are legal (they were inside a render prop before). */
const ComboboxField = ({ fieldItem, value, onChange, hasError }) => {
  const [open, setOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const stringVal = value != null ? String(value) : "";
  const filteredOptions = searchVal.trim()
    ? fieldItem.options?.filter((o) =>
      String(o.label).toLowerCase().includes(searchVal.toLowerCase())
    )
    : fieldItem.options;

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchVal("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between font-normal text-left h-10 bg-white border-input",
            hasError ? "border-destructive text-destructive" : ""
          )}
        >
          {stringVal
            ? fieldItem.options?.find((o) => String(o.value) === stringVal)
              ?.label ?? stringVal
            : `Select ${fieldItem.label}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${fieldItem.label}...`}
            value={searchVal}
            onValueChange={setSearchVal}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions?.map((option) => (
                <CommandItem
                  key={option.value}
                  value={String(option.value)}
                  onSelect={() => {
                    const selected = String(option.value);
                    onChange(selected);
                    fieldItem.onChange?.(selected);
                    setOpen(false);
                    setSearchVal("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      stringVal === String(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/**
 * AddPage — generic shared form component for creating and editing resources.
 *
 * @param {string}   title           - Page/card title (e.g. "Order")
 * @param {string}   apiUrl          - Base API endpoint (e.g. "/orders")
 * @param {string}   queryKey        - React Query key to invalidate on success
 * @param {string}   method          - "POST" | "PUT" — controls add vs edit mode
 * @param {Array}    fields          - Field config array (see below)
 * @param {object}   [initialData]   - Pre-filled data for edit mode
 * @param {Function} [onSuccessAction] - Callback after successful save
 * @param {ReactNode|Function} [children] - Extra content injected inside the form grid
 * @param {Function} [transformPayload]  - Transform form data before sending
 * @param {boolean}  [bypassIdInEdit]   - If true, sends apiUrl as-is without appending /{id}
 * @param {Function} [customSubmit]     - Async fn(payload, rawData) for multi-step saves
 *
 * Field config shape:
 * {
 *   name: string,          // form field key
 *   label: string,         // display label
 *   type: "text" | "number" | "date" | "email" | "password" |
 *          "select" | "combobox" | "multi-select" | "file" | "switch",
 *   required: boolean,
 *   options: [{ value, label }],  // for select / combobox / multi-select
 *   onChange: (value) => void,    // optional side-effect on field change
 * }
 */
const AddPage = ({
  title,
  apiUrl,
  queryKey,
  method,
  fields = [],
  initialData,
  onSuccessAction,
  children,
  transformPayload,
  bypassIdInEdit = false,
  customSubmit,
}) => {
  const isEdit = method === "PUT" || !!initialData?.id;

  const formMethods = useForm({ defaultValues: initialData || {} });
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = formMethods;

  const postMutation = usePost(apiUrl, "post", queryKey);
  const updateMutation = useUpdate(apiUrl, queryKey);
  const [isCustomSubmitting, setIsCustomSubmitting] = useState(false);

  // ── Stable ref so fields array doesn't retrigger useEffect ──────────────
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  // ── File → base64 helper ─────────────────────────────────────────────────
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  // ── Populate form when initialData changes (edit mode) ───────────────────
  const initialDataString = JSON.stringify(initialData);
  useEffect(() => {
    if (initialData) {
      const formattedData = { ...initialData };
      fieldsRef.current.forEach((field) => {
        if (field.type === "date" && initialData[field.name]) {
          try {
            formattedData[field.name] = new Date(initialData[field.name])
              .toISOString()
              .split("T")[0];
          } catch (e) {
            console.error("Error formatting date:", e);
          }
        }
      });
      reset(formattedData, { keepDirtyValues: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataString, reset]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    const payloadToSend = transformPayload ? transformPayload(data) : data;

    if (customSubmit) {
      setIsCustomSubmitting(true);
      try {
        const res = await customSubmit(payloadToSend, data);
        onSuccessAction?.(res);
      } catch (err) {
        console.error("customSubmit failed:", err);
        toast.error(getErrorMessage(err));
      } finally {
        setIsCustomSubmitting(false);
      }
      return;
    }

    if (isEdit) {
      const customUrl = bypassIdInEdit ? apiUrl : null;
      updateMutation.mutate(
        { id: initialData?.id || data?.id, payload: payloadToSend, customUrl },
        {
          onSuccess: (res) => onSuccessAction?.(res),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    } else {
      postMutation.mutate(payloadToSend, {
        onSuccess: (res) => onSuccessAction?.(res),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  };

  const isLoading =
    postMutation.isPending || updateMutation.isPending || isCustomSubmitting;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="mx-auto shadow-lg border-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight capitalize">
          {isEdit ? `Edit ${title}` : `Add ${title}`}
        </CardTitle>
        <CardDescription>Fill in the required fields below</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((fieldItem) => (
              <div key={fieldItem.name} className="space-y-2">
                <Label htmlFor={fieldItem.name}>
                  {fieldItem.label}{" "}
                  {fieldItem.required && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>

                {/* ── Combobox / Select ─────────────────────────────────── */}
                {fieldItem.type === "select" ||
                  fieldItem.type === "combobox" ? (
                  <Controller
                    name={fieldItem.name}
                    control={control}
                    defaultValue={initialData?.[fieldItem.name] || ""}
                    rules={{ required: fieldItem.required }}
                    render={({ field: { onChange: formOnChange, value } }) => (
                      <ComboboxField
                        fieldItem={fieldItem}
                        value={value}
                        onChange={formOnChange}
                        hasError={!!errors[fieldItem.name]}
                      />
                    )}
                  />
                ) : /* ── Multi-select ─────────────────────────────────────── */
                  fieldItem.type === "multi-select" ? (
                    <Controller
                      name={fieldItem.name}
                      control={control}
                      defaultValue={initialData?.[fieldItem.name] || []}
                      rules={{ required: fieldItem.required }}
                      render={({
                        field: { onChange: formOnChange, value = [] },
                      }) => {
                        const safeValue = Array.isArray(value) ? value : [];

                        const handleToggle = (optionValue) => {
                          const str = String(optionValue);
                          const updated = safeValue.includes(str)
                            ? safeValue.filter((v) => v !== str)
                            : [...safeValue, str];
                          formOnChange(updated);
                          fieldItem.onChange?.(updated);
                        };

                        return (
                          <div className="space-y-2">
                            <Select onValueChange={handleToggle} value="">
                              <SelectTrigger
                                className={cn(
                                  "w-full",
                                  errors[fieldItem.name] && "border-destructive"
                                )}
                              >
                                <SelectValue
                                  placeholder={`Select ${fieldItem.label}...`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldItem.options?.map((option) => {
                                  const isSelected = safeValue.includes(
                                    String(option.value)
                                  );
                                  return (
                                    <SelectItem
                                      key={option.value}
                                      value={String(option.value)}
                                      className={
                                        isSelected
                                          ? "bg-accent text-accent-foreground font-medium"
                                          : ""
                                      }
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          readOnly
                                          className="rounded border-gray-300 h-3 w-3"
                                        />
                                        {option.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            {safeValue.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30">
                                {safeValue.map((val) => {
                                  const opt = fieldItem.options?.find(
                                    (o) => String(o.value) === String(val)
                                  );
                                  return (
                                    <span
                                      key={val}
                                      className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-sm shadow-sm"
                                    >
                                      {opt ? opt.label : val}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = safeValue.filter(
                                            (v) => v !== val
                                          );
                                          formOnChange(filtered);
                                          fieldItem.onChange?.(filtered);
                                        }}
                                        className="hover:bg-primary-foreground/20 rounded-full w-3 h-3 inline-flex items-center justify-center text-[10px] font-bold"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  ) : /* ── File upload ─────────────────────────────────────── */
                    fieldItem.type === "file" ? (
                      <Controller
                        name={fieldItem.name}
                        control={control}
                        rules={{ required: isEdit ? false : fieldItem.required }}
                        render={({ field: { onChange: formOnChange, value } }) => (
                          <div className="space-y-3">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const base64 = await toBase64(file);
                                  formOnChange(base64);
                                  fieldItem.onChange?.(base64);
                                }
                              }}
                              className={
                                errors[fieldItem.name] ? "border-destructive" : ""
                              }
                            />
                            {value && (
                              <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                                <img
                                  src={value}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] px-2 py-1">
                                  Current
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      />
                    ) : /* ── Switch / Toggle ──────────────────────────────────── */
                      fieldItem.type === "switch" ? (
                        <Controller
                          name={fieldItem.name}
                          control={control}
                          defaultValue={false}
                          render={({ field: { onChange: formOnChange, value } }) => (
                            <Switch
                              checked={!!value}
                              onCheckedChange={(checked) => {
                                formOnChange(checked);
                                fieldItem.onChange?.(checked);
                              }}
                            />
                          )}
                        />
                      ) : (
                        /* ── Default text / number / date / email / password ───── */
                        <Input
                          id={fieldItem.name}
                          type={fieldItem.type || "text"}
                          {...register(fieldItem.name, {
                            required: fieldItem.required,
                            valueAsNumber: fieldItem.type === "number",
                            onChange: (e) => fieldItem.onChange?.(e.target.value),
                          })}
                          className={
                            errors[fieldItem.name] ? "border-destructive" : ""
                          }
                        />
                      )}

                {errors[fieldItem.name] && (
                  <p className="text-destructive text-xs">
                    This field is required
                  </p>
                )}
              </div>
            ))}

            {/* ── Extra content slot ─────────────────────────────────────── */}
            {children && (
              <div className="col-span-full">
                {typeof children === "function"
                  ? children(formMethods)
                  : children}
              </div>
            )}
          </div>

          {/* ── Submit button ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-32"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdit ? "Update" : "Save"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddPage;